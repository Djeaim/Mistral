# Mistral – Billing Setup (Stripe)

1. Create Prices in Stripe (recurring monthly) for Pro and Business.
   - Copy the Price IDs to env:
     - BILLING_PRICE_PRO=price_...
     - BILLING_PRICE_BUSINESS=price_...
   - (Starter can be left blank or a zero-price placeholder)

2. Set environment variables:
   - STRIPE_SECRET_KEY
   - STRIPE_WEBHOOK_SECRET
   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   - BILLING_PRICE_STARTER (optional)
   - BILLING_PRICE_PRO
   - BILLING_PRICE_BUSINESS
   - BILLING_SUCCESS_URL (e.g., https://yourapp.com/dashboard?upgraded=1)
   - BILLING_CANCEL_URL (e.g., https://yourapp.com/pricing)

3. Webhook endpoint:
   - POST /api/webhooks/stripe
   - Configure in Stripe Dashboard → Webhooks with the secret above.

4. Plan defaults (applied on plan change):
   - starter: 20 emails/hr, 1 campaign, 100 prospects, 20 LinkedIn actions/day
   - pro: 60 emails/hr, 10 campaigns, 5,000 prospects, 80 LinkedIn actions/day
   - business: 200 emails/hr, 50 campaigns, 50,000 prospects, 200 LinkedIn actions/day

5. Cron jobs:
   - Nightly 01:00 UTC: GET /api/worker/aggregate-daily
   - Every 5 minutes: GET /api/worker/send-due-emails
   - Hourly: GET /api/worker/notify-linkedin-due

6. Storage bucket (documents):
   - Create a private bucket named `documents` in Supabase Storage.
   - PDFs are stored at `documents/{user_id}/quotes/{quote_number}.pdf` and `documents/{user_id}/invoices/{invoice_number}.pdf`.
   - Downloads use signed URLs generated server-side.

---

Onboarding, Templates, and Demo Mode

- Onboarding
  - Users without `company_profiles` and no OpenAI key are redirected to `/onboarding`.
  - Steps: company basics → preferences → key or demo → optional SMTP.

- AI Templates
  - Table: `ai_templates` with global (user_id null) and user-specific templates.
  - Browse at `/dashboard/templates`; duplicate globals into your space.
  - Sequence builder provides a template picker; generation falls back to matching template by language/scope.

- Demo Mode
  - POST `/api/demo/create` to load sample data (creates a demo campaign and prospects).
  - Sending is disabled without an OpenAI key; generation falls back to static text.
  - Dashboard shows a Demo banner until a key and SMTP are connected.
