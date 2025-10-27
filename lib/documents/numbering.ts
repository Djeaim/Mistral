import { createServerClient } from '@supabase/ssr';

export async function getNextNumber(userId: string, type: 'quote'|'invoice') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: { get(){}, set(){}, remove(){} } });
  const year = new Date().getUTCFullYear();
  const { data, error } = await supabase.rpc('get_next_number', { p_user_id: userId, p_year: year, p_type: type });
  if (error) throw error;
  const n = String(data as number).padStart(5, '0');
  const prefix = type === 'quote' ? 'Q' : 'F';
  return `${prefix}-${year}-${n}`;
}


