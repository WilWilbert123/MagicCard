import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';

const DEFAULT_SETTINGS = {
  allowSelfServiceReprint: true,
  kioskInactivityTimeoutSeconds: 45,
  defaultBleedMm: 1.5,
  defaultSafeMarginMm: 3.0,
};

export async function GET() {
  try {
    const admin = createAdminSupabaseClient();
    const { data: company } = await admin.from('companies').select('id, settings').limit(1).single();

    if (!company) {
      return NextResponse.json({ data: DEFAULT_SETTINGS });
    }

    const settings = company.settings || {};
    const merged = {
      allowSelfServiceReprint: settings.allowSelfServiceReprint ?? settings.allow_self_service_reprint ?? DEFAULT_SETTINGS.allowSelfServiceReprint,
      kioskInactivityTimeoutSeconds: settings.kioskInactivityTimeoutSeconds ?? settings.kiosk_inactivity_timeout_seconds ?? DEFAULT_SETTINGS.kioskInactivityTimeoutSeconds,
      defaultBleedMm: settings.defaultBleedMm ?? settings.default_bleed_mm ?? DEFAULT_SETTINGS.defaultBleedMm,
      defaultSafeMarginMm: settings.defaultSafeMarginMm ?? settings.default_safe_margin_mm ?? DEFAULT_SETTINGS.defaultSafeMarginMm,
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
    
    const newSettings = {
      ...(company?.settings || {}),
      allowSelfServiceReprint: typeof body.allowSelfServiceReprint === 'boolean' ? body.allowSelfServiceReprint : true,
      kioskInactivityTimeoutSeconds: Number(body.kioskInactivityTimeoutSeconds) || 45,
      defaultBleedMm: Number(body.defaultBleedMm) || 1.5,
      defaultSafeMarginMm: Number(body.defaultSafeMarginMm) || 3.0,
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
          { company_id: company.id, key: 'kiosk_inactivity_timeout_seconds', value: JSON.stringify(newSettings.kioskInactivityTimeoutSeconds) },
          { company_id: company.id, key: 'default_bleed_mm', value: JSON.stringify(newSettings.defaultBleedMm) },
          { company_id: company.id, key: 'default_safe_margin_mm', value: JSON.stringify(newSettings.defaultSafeMarginMm) },
        ];
        await admin.from('system_settings').upsert(settingsToUpsert, { onConflict: 'company_id,key' });
      } catch {
        // Fallback silently if system_settings RLS/schema differs
      }
    }

    return NextResponse.json({ success: true, data: newSettings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
