import { createClient } from '@supabase/supabase-js';

// NEVER import or invoke this file in any client-side component!
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('SECURITY VIOLATION: createAdminClient invoked in browser environment!');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-enterprise.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key';

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
