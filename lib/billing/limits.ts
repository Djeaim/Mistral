import { getSupabaseServer } from '@/lib/supabaseServer';

const PLAN_DEFAULTS = {
  starter: { emails_per_hour: 20, campaigns_max: 1, prospects_max: 100, linkedin_actions_per_day: 20 },
  pro: { emails_per_hour: 60, campaigns_max: 10, prospects_max: 5000, linkedin_actions_per_day: 80 },
  business: { emails_per_hour: 200, campaigns_max: 50, prospects_max: 50000, linkedin_actions_per_day: 200 }
};

export async function getUserPlan(userId: string) {
  const supabase = getSupabaseServer();
  const { data } = await supabase.from('subscriptions').select('plan,status').eq('user_id', userId).maybeSingle();
  return data?.plan || 'starter';
}

export async function getEntitlements(userId: string) {
  const supabase = getSupabaseServer();
  const { data: ent } = await supabase.from('entitlements').select('*').eq('user_id', userId).maybeSingle();
  if (ent) return ent;
  const plan = await getUserPlan(userId);
  return { user_id: userId, ...PLAN_DEFAULTS[plan] };
}

export async function setPlanAndEntitlements(userId: string, plan: 'starter'|'pro'|'business') {
  const supabase = getSupabaseServer();
  await supabase.from('subscriptions').upsert({ user_id: userId, plan }).select('*');
  const d = PLAN_DEFAULTS[plan];
  await supabase.from('entitlements').upsert({ user_id: userId, ...d }).select('*');
}

export async function checkQuota(userId: string, input: { type: 'prospects'|'campaigns'|'emails_per_hour'|'linkedin_actions_per_day', amount?: number }) {
  const ent = await getEntitlements(userId);
  const supabase = getSupabaseServer();
  switch (input.type) {
    case 'campaigns': {
      const { count } = await supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      const allowed = (count || 0) < ent.campaigns_max;
      return allowed ? { allowed } : { allowed: false, reason: 'Campaign limit reached', limit: ent.campaigns_max };
    }
    case 'prospects': {
      const { count } = await supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      const next = (count || 0) + (input.amount || 0);
      const allowed = next <= ent.prospects_max;
      return allowed ? { allowed } : { allowed: false, reason: 'Prospect limit reached', limit: ent.prospects_max };
    }
    case 'emails_per_hour': {
      // Check against entitlement only; worker enforces per hour sending
      const allowed = (input.amount || 1) <= ent.emails_per_hour;
      return allowed ? { allowed } : { allowed: false, reason: 'Emails per hour limit', limit: ent.emails_per_hour };
    }
    case 'linkedin_actions_per_day': {
      const { count } = await supabase
        .from('linkedin_actions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'done')
        .gte('done_at', new Date(Date.now() - 24*60*60*1000).toISOString());
      const next = (count || 0) + (input.amount || 1);
      const allowed = next <= ent.linkedin_actions_per_day;
      return allowed ? { allowed } : { allowed: false, reason: 'Daily LinkedIn actions limit', limit: ent.linkedin_actions_per_day };
    }
  }
}


