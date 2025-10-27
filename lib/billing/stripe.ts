import Stripe from 'stripe';

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY as string;
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY');
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

export const PRICES = {
  starter: process.env.BILLING_PRICE_STARTER || '',
  pro: process.env.BILLING_PRICE_PRO || '',
  business: process.env.BILLING_PRICE_BUSINESS || ''
};


