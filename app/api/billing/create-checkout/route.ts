import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getStripe, PRICES } from '@/lib/billing/stripe';

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { plan } = await req.json();
  if (!['pro','business'].includes(plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  const stripe = getStripe();
  const successUrl = process.env.BILLING_SUCCESS_URL as string;
  const cancelUrl = process.env.BILLING_CANCEL_URL as string;
  const priceId = (PRICES as any)[plan];
  if (!priceId) return NextResponse.json({ error: 'Price not configured' }, { status: 500 });

  // Ensure subscription row exists
  const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', auth.user.id).maybeSingle();
  let customerId = sub?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: auth.user.email || undefined, metadata: { user_id: auth.user.id } });
    customerId = customer.id;
    await supabase.from('subscriptions').upsert({ user_id: auth.user.id, stripe_customer_id: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: 'auto'
  });

  return NextResponse.json({ url: session.url });
}


