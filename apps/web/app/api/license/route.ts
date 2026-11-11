import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getRealSystemSerialNumber } from '@/lib/license/systemHardware';
import {
  validateProductKeys,
  evaluateLicenseStatus,
  LicenseRecord,
  PROGRAM_ID,
  CLIENT_ID,
} from '@/lib/license/licenseValidator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const admin = createAdminSupabaseClient();
    const realSerialNumber = getRealSystemSerialNumber();
    let parsedRecord: LicenseRecord | null = null;

    // 1. Primary check: Query dedicated system_licenses table for this specific machine
    const { data: licenseRow, error: licenseError } = await admin
      .from('system_licenses')
      .select('*')
      .eq('product_number', realSerialNumber)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!licenseError && licenseRow) {
      parsedRecord = {
        productId: licenseRow.product_number,
        productKey: licenseRow.main_product_key || '',
        productKey1: licenseRow.product_key1,
        productKey2: licenseRow.product_key2,
        status: licenseRow.status,
        edition: licenseRow.edition,
        consolidator: licenseRow.edition?.includes('Consolidator') || false,
        installedAt: licenseRow.installation_date,
        endDate: licenseRow.end_date,
        isRegistered: licenseRow.is_active,
      };
    } else {
      // 2. Fallback check: system_settings table if system_licenses has not been migrated yet
      const { data: settingsData } = await admin
        .from('system_settings')
        .select('value')
        .eq('key', 'system_license')
        .maybeSingle();

      if (settingsData?.value) {
        try {
          const raw = typeof settingsData.value === 'string'
            ? JSON.parse(settingsData.value)
            : settingsData.value;
          if (raw && (raw.productId === realSerialNumber || !raw.productId)) {
            parsedRecord = raw;
          }
        } catch (e) {
          console.error('Failed to parse system_license value:', e);
        }
      }
    }

    const evaluation = evaluateLicenseStatus(parsedRecord);
    evaluation.productId = realSerialNumber;

    return NextResponse.json({
      success: true,
      data: evaluation,
      systemInfo: {
        programId: PROGRAM_ID,
        clientId: CLIENT_ID,
        deviceSerialNumber: realSerialNumber,
        serialFL: (realSerialNumber.slice(-1) + realSerialNumber.slice(0, 1)),
      },
    });
  } catch (err: any) {
    const realSerialNumber = getRealSystemSerialNumber();
    const fallbackEval = evaluateLicenseStatus(null);
    fallbackEval.productId = realSerialNumber;

    return NextResponse.json(
      {
        success: false,
        error: err.message,
        data: fallbackEval,
        systemInfo: {
          programId: PROGRAM_ID,
          clientId: CLIENT_ID,
          deviceSerialNumber: realSerialNumber,
          serialFL: (realSerialNumber.slice(-1) + realSerialNumber.slice(0, 1)),
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const realSerialNumber = getRealSystemSerialNumber();
    const targetProductId = (body.productId && String(body.productId).trim()) || realSerialNumber;

    // Support both 3-key RG Generator naming (ProductKey 1, 2, 3) and legacy inputs
    const key1_Main = String(body.productKey1 || body.productKey || body.mainProductKey || '').trim();
    const key2_Duration = String(body.productKey2 || body.productKey1_Duration || '').trim();
    const key3_SystemType = String(body.productKey3 || body.productKey2_SystemType || '').trim();

    const validation = validateProductKeys(
      targetProductId,
      key1_Main,
      key2_Duration,
      key3_SystemType
    );

    if (!validation.valid || !validation.license) {
      return NextResponse.json(
        {
          success: false,
          error: validation.message || 'Invalid product key information.',
        },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();

    // 1. Insert into dedicated system_licenses table
    const { error: insertErr } = await admin
      .from('system_licenses')
      .insert({
        client_id: String(CLIENT_ID),
        program_id: String(PROGRAM_ID),
        product_number: validation.license.productId,
        serial_fl: (validation.license.productId.slice(-1) + validation.license.productId.slice(0, 1)),
        main_product_key: validation.license.productKey,
        product_key1: validation.license.productKey1,
        product_key2: validation.license.productKey2,
        validity_type: validation.license.status,
        status: validation.license.status,
        edition: validation.license.edition,
        installation_date: validation.license.installedAt,
        end_date: validation.license.endDate,
        is_active: validation.license.isRegistered,
      });

    if (insertErr) {
      console.warn('Could not insert to system_licenses table (may need migration applied):', insertErr.message);
      // Fallback: try saving to system_settings if company exists
      const { data: company } = await admin.from('companies').select('id').limit(1).maybeSingle();
      if (company?.id) {
        await admin.from('system_settings').upsert({
          company_id: company.id,
          key: 'system_license',
          value: validation.license,
        }, { onConflict: 'company_id,key' });
      }
    }

    const evaluation = evaluateLicenseStatus(validation.license);
    evaluation.productId = realSerialNumber;

    return NextResponse.json({
      success: true,
      message: 'Product keys verified and registered successfully.',
      license: validation.license,
      data: evaluation,
      systemInfo: {
        programId: PROGRAM_ID,
        clientId: CLIENT_ID,
        deviceSerialNumber: realSerialNumber,
        serialFL: (realSerialNumber.slice(-1) + realSerialNumber.slice(0, 1)),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to register product key.',
      },
      { status: 500 }
    );
  }
}
