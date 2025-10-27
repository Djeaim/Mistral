import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  const id = new URL(req.url).searchParams.get('id');
  const { data: t } = await supabase.from('ai_templates').select('*').eq('id', id).maybeSingle();
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ body: t.body });
}


