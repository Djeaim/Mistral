# Launch Checklist

- [ ] Create Vercel project & connect Git
- [ ] Set all env vars (see docs/env.sample)
- [ ] Create Stripe Prices (monthly) and paste IDs
- [ ] Add Stripe webhook endpoint (points to /api/webhooks/stripe)
- [ ] Supabase: enable RLS; run migrations; create private bucket `documents`
- [ ] Configure Vercel Cron for 4 worker routes
- [ ] Test SMTP on a test campaign (sandbox mailbox)
- [ ] Test OpenAI Key save + test
- [ ] Test billing upgrade/downgrade + portal
- [ ] Check CSP headers & basic rate limit
- [ ] Enable backups (Supabase PITR)
- [ ] Add domain + SSL
- [ ] Run E2E smoke test: create user → onboarding → create campaign → import 3 prospects → schedule 1 email → run worker → check status
