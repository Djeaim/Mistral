import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  const { data: t } = await supabase.from('ai_templates').select('*').eq('id', id).maybeSingle();
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { error } = await supabase.from('ai_templates').insert({ user_id: auth.user.id, scope: t.scope, name: t.name, language: t.language, body: t.body });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.redirect(new URL('/dashboard/templates', req.url));
}


