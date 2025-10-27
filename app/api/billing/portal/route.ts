import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getStripe } from '@/lib/billing/stripe';

export async function POST(_req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', auth.user.id).maybeSingle();
  if (!sub?.stripe_customer_id) return NextResponse.json({ error: 'No customer' }, { status: 400 });
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: process.env.BILLING_SUCCESS_URL as string });
  return NextResponse.json({ url: session.url });
}


