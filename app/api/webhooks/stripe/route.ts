import { NextResponse, type NextRequest } from 'next/server';
import { getStripe } from '@/lib/billing/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const sig = req.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
  let event: Stripe.Event;
  const body = await req.text();
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, { auth: { persistSession: false } });

  switch (event.type) {
    case 'customer.created': {
      const customer = event.data.object as Stripe.Customer;
      const userId = (customer.metadata as any)?.user_id;
      if (userId && customer.id) {
        await supabase.from('subscriptions').upsert({ user_id: userId, stripe_customer_id: customer.id });
      }
      break;
    }
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.customer && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = (sub.items.data[0]?.price?.id) as string;
        const plan = mapPriceToPlan(priceId);
        const customer = await stripe.customers.retrieve(session.customer as string) as Stripe.Customer;
        const userId = (customer.metadata as any)?.user_id;
        if (userId) {
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: sub.id,
            plan,
            status: sub.status as any,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString()
          });
          await setPlanEntitlements(supabase, userId, plan);
        }
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = (sub.items.data[0]?.price?.id) as string;
      const plan = mapPriceToPlan(priceId);
      const customerId = sub.customer as string;
      const { data } = await supabase.from('subscriptions').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
      if (data?.user_id) {
        await supabase.from('subscriptions').update({
          stripe_subscription_id: sub.id,
          plan,
          status: sub.status as any,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString()
        }).eq('user_id', data.user_id);
        await setPlanEntitlements(supabase, data.user_id, plan);
      }
      break;
    }
    case 'invoice.paid': {
      // keep active
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const { data } = await supabase.from('subscriptions').select('user_id').eq('stripe_customer_id', customerId).maybeSingle();
      if (data?.user_id) await supabase.from('subscriptions').update({ status: 'past_due' }).eq('user_id', data.user_id);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

function mapPriceToPlan(priceId: string): 'starter'|'pro'|'business' {
  if (!priceId) return 'starter';
  if (priceId === process.env.BILLING_PRICE_PRO) return 'pro';
  if (priceId === process.env.BILLING_PRICE_BUSINESS) return 'business';
  return 'starter';
}

async function setPlanEntitlements(supabase: ReturnType<typeof createClient>, userId: string, plan: 'starter'|'pro'|'business') {
  const defaults: any = {
    starter: { emails_per_hour: 20, campaigns_max: 1, prospects_max: 100, linkedin_actions_per_day: 20 },
    pro: { emails_per_hour: 60, campaigns_max: 10, prospects_max: 5000, linkedin_actions_per_day: 80 },
    business: { emails_per_hour: 200, campaigns_max: 50, prospects_max: 50000, linkedin_actions_per_day: 200 }
  };
  await supabase.from('entitlements').upsert({ user_id: userId, ...defaults[plan] });
}


