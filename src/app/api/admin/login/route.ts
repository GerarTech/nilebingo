import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPassword, verifyAdmin } from '@/lib/server/admin';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!password) {
      return NextResponse.json({ success: false, error: 'Password required' }, { status: 400 });
    }

    // Try username+password auth against admin_users table
    if (username && supabase) {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id, username, role, password_hash')
        .eq('username', username)
        .maybeSingle();

      if (adminUser && adminUser.password_hash === hashPassword(password)) {
        // Update last_login
        await supabase
          .from('admin_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', adminUser.id);

        const session = {
          userId: adminUser.id,
          username: adminUser.username,
          role: adminUser.role,
          expiresAt: Date.now() + 86400000, // 24 hours
        };
        const token = Buffer.from(JSON.stringify(session)).toString('base64');
        return NextResponse.json({ success: true, session, token });
      }

      if (adminUser) {
        return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
      }
      // Fall through to legacy check if username not found in admin_users
    }

    // Legacy: password-only auth via ADMIN_PASSWORD env var (for backward compatibility)
    if (verifyAdmin(password)) {
      const session = {
        userId: 'env-superadmin',
        username: 'superadmin',
        role: 'super_admin' as const,
        expiresAt: Date.now() + 86400000,
      };
      const token = Buffer.from(JSON.stringify(session)).toString('base64');
      return NextResponse.json({ success: true, session, token });
    }

    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
