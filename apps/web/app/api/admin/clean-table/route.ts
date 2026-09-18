import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

// Core Security & System Tables that are STRICTLY PROTECTED and can NEVER be cleared
const PROTECTED_TABLES = [
  'profiles',
  'roles',
  'user_roles',
  'permissions',
  'role_permissions',
  'system_settings',
];

// List of allowed clearable tables and their cascading dependencies
const CLEARABLE_TABLES_MAP: Record<string, { label: string; dependencies?: string[] }> = {
  employees: {
    label: 'Employees Directory',
    dependencies: ['employee_photos', 'print_jobs'],
  },
  employee_photos: {
    label: 'Employee Photo Records',
  },
  print_jobs: {
    label: 'Print Job History',
    dependencies: ['print_job_events'],
  },
  print_job_events: {
    label: 'Print Job Hardware Events',
  },
  audit_logs: {
    label: 'System Audit Logs & Dispatches',
  },
  kiosk_devices: {
    label: 'Registered Kiosk Hardware Devices',
    dependencies: ['kiosk_heartbeats', 'kiosk_credentials'],
  },
  kiosk_credentials: {
    label: 'Kiosk Security Credentials',
  },
  kiosk_heartbeats: {
    label: 'Kiosk Telemetry & Heartbeats',
  },
  kiosks: {
    label: 'Kiosk Terminal Registry',
  },
  card_templates: {
    label: 'ID Card Templates',
    dependencies: ['card_template_versions'],
  },
  card_template_versions: {
    label: 'ID Card Template Versions',
  },
  printers: {
    label: 'Hardware Printers',
  },
  departments: {
    label: 'Departments Structure',
  },
  positions: {
    label: 'Job Positions',
  },
  branches: {
    label: 'Branch Locations',
  },
  companies: {
    label: 'Company Entities',
  },
};

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();
    
    // Fetch row counts for all known database tables
    const tableCounts: Record<string, { count: number; isProtected: boolean; label: string }> = {};

    const allTables = [
      ...PROTECTED_TABLES.map(t => ({ name: t, isProtected: true, label: `[Protected] ${t}` })),
      ...Object.entries(CLEARABLE_TABLES_MAP).map(([name, info]) => ({ name, isProtected: false, label: info.label })),
    ];

    await Promise.all(
      allTables.map(async (table) => {
        try {
          const { count, error } = await supabase
            .from(table.name)
            .select('*', { count: 'exact', head: true });
          
          tableCounts[table.name] = {
            count: error ? 0 : (count || 0),
            isProtected: table.isProtected,
            label: table.label,
          };
        } catch {
          tableCounts[table.name] = { count: 0, isProtected: table.isProtected, label: table.label };
        }
      })
    );

    return NextResponse.json({ success: true, data: tableCounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch table metrics.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { tableName, confirmationText } = body;

    if (!tableName || typeof tableName !== 'string') {
      return NextResponse.json({ error: 'Target table name is required.' }, { status: 400 });
    }

    if (confirmationText !== 'DELETE DATA') {
      return NextResponse.json(
        { error: 'Invalid confirmation text. You must type exact text "DELETE DATA" to proceed.' },
        { status: 400 }
      );
    }

    const normalizedTable = tableName.trim().toLowerCase();

    // 1. Strict Security Check: Block cleanup on core system tables
    if (PROTECTED_TABLES.includes(normalizedTable)) {
      return NextResponse.json(
        {
          error: `Security Policy Violation: Core system table '${normalizedTable}' (Roles, User Roles, Profiles, System Settings) is strictly protected and cannot be cleared.`,
        },
        { status: 403 }
      );
    }

    const tableConfig = CLEARABLE_TABLES_MAP[normalizedTable];
    if (!tableConfig) {
      return NextResponse.json(
        { error: `Table '${normalizedTable}' is not in the list of recognized clearable database tables.` },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    // 2. Cascade cleaning of foreign key dependencies if necessary
    if (tableConfig.dependencies && tableConfig.dependencies.length > 0) {
      for (const depTable of tableConfig.dependencies) {
        try {
          await supabase.from(depTable).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch (depErr) {
          console.warn(`Warning: Could not clear dependency table '${depTable}':`, depErr);
        }
      }
    }

    // 3. Clear target table records
    const { count, error } = await supabase
      .from(normalizedTable)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      // Fallback deletion query if ID column uses non-UUID format
      const { error: fallbackErr } = await supabase.from(normalizedTable).delete().gt('created_at', '1970-01-01');
      if (fallbackErr) {
        throw new Error(`Failed to clear table '${normalizedTable}': ${error.message}`);
      }
    }

    // 4. Record audit log
    try {
      await supabase.from('audit_logs').insert({
        action: 'TABLE_CLEARED_BY_SUPER_ADMIN',
        details: `Super Admin cleared all data from table '${normalizedTable}' (${tableConfig.label}).`,
        category: 'SYSTEM_MAINTENANCE',
      });
    } catch {}

    return NextResponse.json({
      success: true,
      tableName: normalizedTable,
      label: tableConfig.label,
      deletedRecords: count || 'All',
      message: `Successfully cleared all records from Supabase table '${normalizedTable}' (${tableConfig.label}).`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to clear database table.' }, { status: 500 });
  }
}
