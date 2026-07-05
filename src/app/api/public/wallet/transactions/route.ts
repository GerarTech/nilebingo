import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseServiceKey) throw new Error('Missing Supabase environment variables');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('id, type, amount, status, reference, created_at, details')
      .eq('user_id', userId)
      .neq('reference', '__DRAFT__')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Transactions fetch error:', error);
      return NextResponse.json({ error: 'Failed to load transactions.' }, { status: 500 });
    }

    return NextResponse.json({ transactions: data || [] });
  } catch (error) {
    console.error('Transactions API error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
