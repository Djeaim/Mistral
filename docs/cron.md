# Cron Jobs (Vercel)

Configure in Vercel → Project → Settings → Cron Jobs

- Every 5 minutes: GET /api/worker/send-due-emails
- Hourly: GET /api/worker/notify-linkedin-due
- Daily 01:00 UTC: GET /api/worker/aggregate-daily
- Daily 06:00 UTC: GET /api/worker/invoices-overdue-detection

Example vercel.json (if using file-based config):

{
  "crons": [
    { "path": "/api/worker/send-due-emails", "schedule": "*/5 * * * *" },
    { "path": "/api/worker/notify-linkedin-due", "schedule": "0 * * * *" },
    { "path": "/api/worker/aggregate-daily", "schedule": "0 1 * * *" },
    { "path": "/api/worker/invoices-overdue-detection", "schedule": "0 6 * * *" }
  ]
}

Env hints:
- SUPABASE_SERVICE_ROLE_KEY must be set for worker routes that aggregate or update across users.
- Rate limits: workers should be idempotent; they skip already processed items.
