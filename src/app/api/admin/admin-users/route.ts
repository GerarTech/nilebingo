import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth, hasRole, hashPassword } from '@/lib/server/admin';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase environment variables');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function authCheck(request: NextRequest) {
  const cookie = request.cookies.get('admin_session')?.value || request.cookies.get('admin_token')?.value;
  return checkAdminAuth(cookie);
}

export async function GET(request: NextRequest) {
  const { authorized } = authCheck(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, username, role, created_at, last_login')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { authorized, session } = authCheck(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { action, id, username, password, role } = body;

    if (action === 'create') {
      // Only admin+ can create users
      if (!hasRole(session, 'admin')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      if (!username || !password || !role) {
        return NextResponse.json({ error: 'username, password, and role are required' }, { status: 400 });
      }
      // Only super_admin can create other super_admins
      if (role === 'super_admin' && session?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Only super admin can create super admin users' }, { status: 403 });
      }
      const { data: existing } = await supabase
        .from('admin_users')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
      }
      const { data, error } = await supabase
        .from('admin_users')
        .insert({ username, password_hash: hashPassword(password), role })
        .select('id, username, role, created_at')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    if (action === 'update') {
      if (!hasRole(session, 'admin')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

      // Check target user's current role
      const { data: target } = await supabase
        .from('admin_users')
        .select('role')
        .eq('id', id)
        .single();

      // Cannot change super_admin role unless you are super_admin
      if (target?.role === 'super_admin' && session?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Only super admin can modify super admin' }, { status: 403 });
      }

      const updates: Record<string, string> = {};
      if (role) {
        // Only super_admin can assign super_admin role
        if (role === 'super_admin' && session?.role !== 'super_admin') {
          return NextResponse.json({ error: 'Only super admin can assign super admin role' }, { status: 403 });
        }
        updates.role = role;
      }
      if (password) updates.password_hash = hashPassword(password);
      const { data, error } = await supabase
        .from('admin_users')
        .update(updates)
        .eq('id', id)
        .select('id, username, role, created_at, last_login')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data);
    }

    if (action === 'delete') {
      if (!hasRole(session, 'admin')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
      const { data: target } = await supabase
        .from('admin_users')
        .select('role')
        .eq('id', id)
        .single();
      if (target?.role === 'super_admin') {
        return NextResponse.json({ error: 'Cannot delete super admin' }, { status: 403 });
      }
      const { error } = await supabase.from('admin_users').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
