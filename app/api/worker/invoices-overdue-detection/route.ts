import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, { auth: { persistSession: false } });
    const today = new Date().toISOString().slice(0,10);
    const { data: due } = await supabase
      .from('invoices')
      .select('id,user_id')
      .in('status', ['draft','sent'])
      .lt('due_date', today);
    for (const inv of due || []) {
      await Promise.all([
        supabase.from('invoices').update({ status: 'overdue' }).eq('id', inv.id),
        supabase.from('events').insert({ user_id: inv.user_id, type: 'invoice_overdue', meta: { invoice_id: inv.id } })
      ]);
    }
    return NextResponse.json({ updated: (due || []).length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Worker error' }, { status: 500 });
  }
}


