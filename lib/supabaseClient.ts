import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Avoid crashing during build when envs are missing; runtime will fail gracefully
  // eslint-disable-next-line no-console
  console.warn('Supabase URL or Anon Key is not set in environment variables.');
}

export const supabaseClient = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');


