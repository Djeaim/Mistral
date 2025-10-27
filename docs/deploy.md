# Deploy (Vercel + Supabase + Stripe)

1) Supabase
- Create project, copy URL and ANON/SERVICE keys
- Enable RLS (default), create private Storage bucket `documents`
- Run SQL from `supabase/setup.sql`
- Enable PITR/backups (recommended) and schedule automated backups

2) Stripe
- Create Prices (monthly) for Pro and Business
- Copy price IDs into env (BILLING_PRICE_PRO, BILLING_PRICE_BUSINESS)
- Add webhook endpoint pointing to `/api/webhooks/stripe` and set STRIPE_WEBHOOK_SECRET

3) Vercel
- Create project and connect Git
- Set env vars from `docs/env.sample`
- Add Cron Jobs per `docs/cron.md`
- Add domain + SSL

4) Deploy
- Push to main; Vercel builds the Next.js app
- Open the app; create a user; complete onboarding

5) Post-deploy checks
- Test OpenAI key save + validation
- Create SMTP credential (sandbox mailbox) and send a test email
- Create campaign, import a few prospects, schedule and run the worker
- Validate Stripe checkout + customer portal
- Verify CSP headers and rate limit responses
- Confirm Storage signed URL access works
