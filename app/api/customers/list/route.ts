import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET(_req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data } = await supabase.from('customers').select('id,company_name').order('company_name');
  return NextResponse.json({ items: data || [] });
}


