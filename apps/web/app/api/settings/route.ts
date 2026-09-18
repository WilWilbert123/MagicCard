import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { recordAuditLog } from '@/lib/audit/logger';

const DEFAULT_SETTINGS = {
  allowSelfServiceReprint: true,
  restrictCrossBranchPrinting: false,
  kioskInactivityTimeoutSeconds: 45,
  defaultBleedMm: 1.5,
  defaultSafeMarginMm: 3.0,
  verificationBaseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://magic-card-trust-id.vercel.app',
  defaultPreviewPhotoUrl: '',
  defaultCompanyLogoUrl: '',
  defaultPreviewName: 'Sample Employee',
  defaultPreviewEmployeeNumber: 'EMP-000125',
  defaultPreviewDepartment: 'Engineering & Technology',
  defaultPreviewPosition: 'Software Engineer',
};

function cleanVerificationUrl(rawUrl: any): string {
  if (!rawUrl) return DEFAULT_SETTINGS.verificationBaseUrl;
  let str = String(rawUrl).trim();
  try {
    while (typeof str === 'string' && ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith('\\"') && str.endsWith('\\"')))) {
      const parsed = JSON.parse(str);
      if (typeof parsed === 'string') str = parsed;
      else break;
    }
  } catch {}
  return str.replace(/^"|"$/g, '').replace(/\\/g, '').trim() || DEFAULT_SETTINGS.verificationBaseUrl;
}

export async function GET() {
  try {
    const admin = createAdminSupabaseClient();
    const [{ data: company }, { data: sysSettings }] = await Promise.all([
      admin.from('companies').select('id, settings').limit(1).maybeSingle(),
      admin.from('system_settings').select('key, value'),
    ]);

    const sysMap = new Map((sysSettings || []).map((s: any) => [s.key, s.value]));
    const rawSysUrl = sysMap.get('verification_base_url');

    const settings = company?.settings || {};
    const rawUrl = rawSysUrl ?? settings.verificationBaseUrl ?? settings.verification_base_url;

    const merged = {
      allowSelfServiceReprint: settings.allowSelfServiceReprint ?? settings.allow_self_service_reprint ?? DEFAULT_SETTINGS.allowSelfServiceReprint,
      restrictCrossBranchPrinting: settings.restrictCrossBranchPrinting ?? settings.restrict_cross_branch_printing ?? DEFAULT_SETTINGS.restrictCrossBranchPrinting,
      kioskInactivityTimeoutSeconds: settings.kioskInactivityTimeoutSeconds ?? settings.kiosk_inactivity_timeout_seconds ?? DEFAULT_SETTINGS.kioskInactivityTimeoutSeconds,
      defaultBleedMm: settings.defaultBleedMm ?? settings.default_bleed_mm ?? DEFAULT_SETTINGS.defaultBleedMm,
      defaultSafeMarginMm: settings.defaultSafeMarginMm ?? settings.default_safe_margin_mm ?? DEFAULT_SETTINGS.defaultSafeMarginMm,
      verificationBaseUrl: cleanVerificationUrl(rawUrl),
      defaultPreviewPhotoUrl: settings.defaultPreviewPhotoUrl ?? settings.default_preview_photo_url ?? '',
      defaultCompanyLogoUrl: settings.defaultCompanyLogoUrl ?? settings.default_company_logo_url ?? '',
      defaultPreviewName: settings.defaultPreviewName ?? settings.default_preview_name ?? 'Sample Employee',
      defaultPreviewEmployeeNumber: settings.defaultPreviewEmployeeNumber ?? settings.default_preview_employee_number ?? 'EMP-000125',
      defaultPreviewDepartment: settings.defaultPreviewDepartment ?? settings.default_preview_department ?? 'Engineering & Technology',
      defaultPreviewPosition: settings.defaultPreviewPosition ?? settings.default_preview_position ?? 'Software Engineer',
    };

    return NextResponse.json({ data: merged });
  } catch (err: any) {
    return NextResponse.json({ data: DEFAULT_SETTINGS, error: err.message });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const admin = createAdminSupabaseClient();

    const { data: company } = await admin.from('companies').select('id, settings').limit(1).single();
    
    const cleanUrl = cleanVerificationUrl(body.verificationBaseUrl);
    const newSettings = {
      ...(company?.settings || {}),
      allowSelfServiceReprint: typeof body.allowSelfServiceReprint === 'boolean' ? body.allowSelfServiceReprint : true,
      restrictCrossBranchPrinting: typeof body.restrictCrossBranchPrinting === 'boolean' ? body.restrictCrossBranchPrinting : false,
      kioskInactivityTimeoutSeconds: Number(body.kioskInactivityTimeoutSeconds) || 45,
      defaultBleedMm: Number(body.defaultBleedMm) || 1.5,
      defaultSafeMarginMm: Number(body.defaultSafeMarginMm) || 3.0,
      verificationBaseUrl: cleanUrl,
      defaultPreviewPhotoUrl: body.defaultPreviewPhotoUrl ?? '',
      defaultCompanyLogoUrl: body.defaultCompanyLogoUrl ?? '',
      defaultPreviewName: body.defaultPreviewName ?? 'Sample Employee',
      defaultPreviewEmployeeNumber: body.defaultPreviewEmployeeNumber ?? 'EMP-000125',
      defaultPreviewDepartment: body.defaultPreviewDepartment ?? 'Engineering & Technology',
      defaultPreviewPosition: body.defaultPreviewPosition ?? 'Software Engineer',
    };

    if (company?.id) {
      const { error } = await admin
        .from('companies')
        .update({
          settings: newSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', company.id);

      if (error) throw error;
    }

    // Try to update system_settings table if it exists
    if (company?.id) {
      try {
        const settingsToUpsert = [
          { company_id: company.id, key: 'allow_self_service_reprint', value: JSON.stringify(newSettings.allowSelfServiceReprint) },
          { company_id: company.id, key: 'restrict_cross_branch_printing', value: JSON.stringify(newSettings.restrictCrossBranchPrinting) },
          { company_id: company.id, key: 'kiosk_inactivity_timeout_seconds', value: JSON.stringify(newSettings.kioskInactivityTimeoutSeconds) },
          { company_id: company.id, key: 'default_bleed_mm', value: JSON.stringify(newSettings.defaultBleedMm) },
          { company_id: company.id, key: 'default_safe_margin_mm', value: JSON.stringify(newSettings.defaultSafeMarginMm) },
          { company_id: company.id, key: 'verification_base_url', value: JSON.stringify(cleanUrl) },
          { company_id: company.id, key: 'default_preview_photo_url', value: JSON.stringify(newSettings.defaultPreviewPhotoUrl) },
          { company_id: company.id, key: 'default_company_logo_url', value: JSON.stringify(newSettings.defaultCompanyLogoUrl) },
        ];
        await admin.from('system_settings').upsert(settingsToUpsert, { onConflict: 'company_id,key' });
      } catch {
        // Fallback silently if system_settings RLS/schema differs
      }
    }

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'UPDATE_SETTINGS',
      entityType: 'SystemSettings',
      entityName: 'KIOSK & Template Policies',
      details: `Updated system settings & badge preview defaults.`,
    });

    return NextResponse.json({ success: true, data: newSettings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
