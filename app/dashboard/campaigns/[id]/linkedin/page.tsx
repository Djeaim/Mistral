import { getSupabaseServer } from '@/lib/supabaseServer';
import ClientView from './view';

export default async function LinkedInQueuePage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServer();
  const id = (await params).id;
  const [{ data: actions }, { data: ent }, { data: sub }] = await Promise.all([
    supabase
    .from('linkedin_actions')
    .select('id,action_type,ai_message,due_at,status,prospect:prospects(id,first_name,last_name,company,linkedin_url,title)')
    .eq('campaign_id', id)
    .order('due_at', { ascending: true }),
    supabase.from('entitlements').select('*').maybeSingle(),
    supabase.from('subscriptions').select('plan').maybeSingle()
  ]);

  return (
    <ClientView campaignId={id} initialActions={actions || []} />
  );
}


