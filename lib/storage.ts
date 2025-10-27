import { createServerClient } from '@supabase/ssr';

export async function uploadDocument(path: string, data: ArrayBuffer | Buffer, contentType = 'application/pdf') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: { get(){}, set(){}, remove(){} } });
  const { error } = await supabase.storage.from('documents').upload(path, data, { contentType, upsert: true });
  if (error) throw error;
  return { path };
}

export async function getSignedUrl(path: string, expiresIn = 60 * 60) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: { get(){}, set(){}, remove(){} } });
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl as string;
}


