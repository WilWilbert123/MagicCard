import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { recordAuditLog } from '@/lib/audit/logger';

/**
 * Checks if the specified user has the "Super Admin" role directly from Supabase user_roles table.
 */
async function checkIsSuperAdmin(adminClient: any, userId: string): Promise<boolean> {
  try {
    const { data: userRole } = await adminClient
      .from('user_roles')
      .select('roles!inner(name)')
      .eq('user_id', userId)
      .maybeSingle();

    if (userRole?.roles?.name === 'Super Admin') {
      return true;
    }

    // Fallback if user_roles table is completely empty during initial system boot
    const { count } = await adminClient
      .from('user_roles')
      .select('*', { count: 'exact', head: true });

    if (count === 0) {
      // First setup - primary admin is treated as Super Admin
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const admin = createAdminSupabaseClient();

    const isCallerSuperAdmin = await checkIsSuperAdmin(admin, auth.user.id);

    // 1. Fetch profiles from database
    const { data: profiles } = await admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Fetch Auth users
    const { data: authUsers, error: authErr } = await admin.auth.admin.listUsers();
    if (authErr) throw authErr;

    const authMap = new Map((authUsers?.users || []).map((u) => [u.id, u]));

    // 3. Fetch user roles directly from Supabase user_roles -> roles join
    const { data: userRoles } = await admin
      .from('user_roles')
      .select('user_id, role_id, roles(id, name, description)');

    const roleMap = new Map();
    (userRoles || []).forEach((ur: any) => {
      if (ur.roles) {
        roleMap.set(ur.user_id, {
          id: ur.roles.id || ur.role_id,
          name: ur.roles.name,
          description: ur.roles.description || '',
        });
      }
    });

    // 4. Fetch permissions master list & user_permissions mapping
    const { data: systemPermissions } = await admin
      .from('permissions')
      .select('id, code, module, description')
      .order('module', { ascending: true });

    const { data: userPermissions } = await admin
      .from('user_permissions')
      .select('user_id, permission_id');

    const userPermsMap = new Map<string, string[]>();
    (userPermissions || []).forEach((up: any) => {
      const existing = userPermsMap.get(up.user_id) || [];
      existing.push(up.permission_id);
      userPermsMap.set(up.user_id, existing);
    });

    // Default HR Admin role query fallback from DB if user has no role record yet
    const { data: hrAdminRole } = await admin
      .from('roles')
      .select('id, name, description')
      .eq('name', 'HR Admin')
      .maybeSingle();

    const defaultRoleObj = hrAdminRole || { id: null, name: 'HR Admin', description: '' };

    // Map profiles combined with Auth, Role, and Permissions info
    const list: any[] = (profiles || []).map((p: any) => {
      const authUser = authMap.get(p.id);
      const roleInfo = roleMap.get(p.id) || defaultRoleObj;
      const permIds = userPermsMap.get(p.id) || [];

      return {
        id: p.id,
        email: p.email || authUser?.email || '',
        displayName: p.full_name || authUser?.user_metadata?.full_name || 'HR Admin',
        isActive: p.is_active ?? true,
        role: roleInfo,
        permissionIds: permIds,
        createdAt: p.created_at || authUser?.created_at || new Date().toISOString(),
        lastSignInAt: authUser?.last_sign_in_at || null,
        isCurrent: p.id === auth.user.id,
      };
    });

    // Include orphan auth users if any
    (authUsers?.users || []).forEach((u) => {
      if (!list.some((item) => item.id === u.id)) {
        const roleInfo = roleMap.get(u.id) || defaultRoleObj;
        const permIds = userPermsMap.get(u.id) || [];

        list.push({
          id: u.id,
          email: u.email || '',
          displayName: u.user_metadata?.full_name || u.email?.split('@')[0] || 'HR Admin',
          isActive: true,
          role: roleInfo,
          permissionIds: permIds,
          createdAt: u.created_at || new Date().toISOString(),
          lastSignInAt: u.last_sign_in_at || null,
          isCurrent: u.id === auth.user.id,
        });
      }
    });

    return NextResponse.json({
      data: list,
      systemPermissions: systemPermissions || [],
      isSuperAdmin: isCallerSuperAdmin,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, data: [], systemPermissions: [], isSuperAdmin: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const admin = createAdminSupabaseClient();
    const isCallerSuperAdmin = await checkIsSuperAdmin(admin, auth.user.id);

    if (!isCallerSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admins can add or configure administrator accounts.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const displayName = String(body.displayName || '').trim();
    const requestedRoleId = body.roleId ? String(body.roleId).trim() : null;
    const permissionIds: string[] = Array.isArray(body.permissionIds) ? body.permissionIds : [];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email address is required.' }, { status: 400 });
    }
    if (!password || password.length < 12) {
      return NextResponse.json({ error: 'Password must be at least 12 characters long.' }, { status: 400 });
    }
    if (!displayName) {
      return NextResponse.json({ error: 'Display name / Full name is required.' }, { status: 400 });
    }

    // 1. Fetch current auth users to check for email duplication
    const { data: authUsers, error: listErr } = await admin.auth.admin.listUsers();
    if (listErr) {
      console.error('Failed to list auth users:', listErr);
    }

    const existingAuthUser = authUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );

    if (existingAuthUser) {
      return NextResponse.json(
        { error: `An account with the email address "${email}" already exists.` },
        { status: 400 }
      );
    }

    // 2. Check profiles for orphan profiles with the same email and clean them up
    const { data: orphanProfiles } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email);

    if (orphanProfiles && orphanProfiles.length > 0) {
      const authUserIds = new Set(authUsers?.users?.map((u) => u.id) || []);
      for (const p of orphanProfiles) {
        if (!authUserIds.has(p.id)) {
          await admin.from('profiles').delete().eq('id', p.id);
        } else {
          return NextResponse.json(
            { error: `An account with the email address "${email}" already exists.` },
            { status: 400 }
          );
        }
      }
    }

    // 3. Get default company_id from database
    const { data: company } = await admin
      .from('companies')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const companyId = company?.id;

    // 4. Create user in Supabase Auth
    let userId: string | null = null;
    let createdAt = new Date().toISOString();

    const { data: createdAuth, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: displayName },
    });

    if (createError || !createdAuth?.user) {
      console.error('Supabase Auth createUser error:', createError);
      return NextResponse.json(
        { error: createError?.message || 'Failed to create user login credentials in Auth system.' },
        { status: 400 }
      );
    }

    userId = createdAuth.user.id;
    createdAt = createdAuth.user.created_at || createdAt;

    // 5. Upsert into profiles table
    const { error: profileErr } = await admin.from('profiles').upsert({
      id: userId,
      company_id: companyId || null,
      email,
      full_name: displayName,
      is_active: true,
      created_at: createdAt,
      updated_at: new Date().toISOString(),
    });

    if (profileErr) {
      console.error('Profile creation error:', profileErr);
      return NextResponse.json(
        { error: profileErr.message || 'Failed to create profile record.' },
        { status: 500 }
      );
    }

    // 6. Determine role ID from database query
    let finalRoleId = requestedRoleId;
    if (!finalRoleId) {
      const { data: defaultHrRole } = await admin
        .from('roles')
        .select('id')
        .eq('name', 'HR Admin')
        .maybeSingle();
      finalRoleId = defaultHrRole?.id;
    }

    // Assign to user_roles table in Supabase
    if (finalRoleId) {
      await admin.from('user_roles').delete().eq('user_id', userId);
      const { error: roleAssignErr } = await admin.from('user_roles').insert({
        user_id: userId,
        role_id: finalRoleId,
      });

      if (roleAssignErr) {
        console.warn('Could not assign role to user_roles table:', roleAssignErr.message);
      }
    }

    // 7. Insert user_permissions if specified
    if (permissionIds.length > 0) {
      const permRows = permissionIds.map((pId) => ({
        user_id: userId,
        permission_id: pId,
      }));
      const { error: permErr } = await admin.from('user_permissions').insert(permRows);
      if (permErr) {
        console.warn('Could not assign permissions to user_permissions table:', permErr.message);
      }
    }

    // Fetch assigned role details directly from public.roles
    const { data: assignedRole } = finalRoleId
      ? await admin.from('roles').select('id, name, description').eq('id', finalRoleId).maybeSingle()
      : { data: null };

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: userId,
      entityName: `${displayName} (${email})`,
      details: `Created new user account for "${displayName}" (${email}) with role "${assignedRole?.name || 'HR Admin'}" and ${permissionIds.length} custom permissions.`,
    });

    return NextResponse.json(
      {
        data: {
          id: userId,
          email,
          displayName,
          role: assignedRole || { id: finalRoleId, name: 'HR Admin' },
          permissionIds,
          createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('POST /api/auth/users error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred while creating user.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const admin = createAdminSupabaseClient();
    const isCallerSuperAdmin = await checkIsSuperAdmin(admin, auth.user.id);

    if (!isCallerSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admins can update administrator accounts.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const userId = String(body.userId || '').trim();
    const roleId = body.roleId ? String(body.roleId).trim() : null;
    const permissionIds: string[] = Array.isArray(body.permissionIds) ? body.permissionIds : [];

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    // Update role if provided
    if (roleId) {
      await admin.from('user_roles').delete().eq('user_id', userId);
      await admin.from('user_roles').insert({ user_id: userId, role_id: roleId });
    }

    // Update permissions
    await admin.from('user_permissions').delete().eq('user_id', userId);
    if (permissionIds.length > 0) {
      const permRows = permissionIds.map((pId) => ({
        user_id: userId,
        permission_id: pId,
      }));
      await admin.from('user_permissions').insert(permRows);
    }

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'UPDATE_USER_PERMISSIONS',
      entityType: 'User',
      entityId: userId,
      entityName: `User ID ${userId}`,
      details: `Updated permissions for user ID "${userId}" (${permissionIds.length} permissions assigned).`,
    });

    return NextResponse.json({ success: true, permissionIds });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const admin = createAdminSupabaseClient();
    const isCallerSuperAdmin = await checkIsSuperAdmin(admin, auth.user.id);

    if (!isCallerSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admins can delete administrator accounts.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    if (auth.user.id === id) {
      return NextResponse.json({ error: 'You cannot delete your own currently logged-in account.' }, { status: 400 });
    }

    const { data: targetProfile } = await admin.from('profiles').select('email, full_name').eq('id', id).maybeSingle();

    // Delete from user_roles
    await admin.from('user_roles').delete().eq('user_id', id);
    // Delete from user_permissions
    await admin.from('user_permissions').delete().eq('user_id', id);

    // Delete from auth.users
    const { error: authErr } = await admin.auth.admin.deleteUser(id);
    if (authErr) throw authErr;

    // Delete from profiles
    await admin.from('profiles').delete().eq('id', id);

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: id,
      entityName: targetProfile ? `${targetProfile.full_name} (${targetProfile.email})` : 'User Account',
      details: targetProfile
        ? `Deleted user account "${targetProfile.full_name}" (${targetProfile.email}).`
        : `Deleted user account ID "${id}".`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
