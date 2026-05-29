# send-report-notification

Supabase Edge Function for the `todo.md` notification flow. It sends queued
Vaidy anomaly summaries through Resend.

## Environment

Set these secrets in Supabase:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set RESEND_API_KEY=...
supabase secrets set RESEND_FROM_EMAIL="Vaidy <alerts@your-domain.com>"
supabase secrets set VAIDY_APP_URL="https://your-app.example"
```

`SUPABASE_URL` is available automatically in Supabase Edge Functions.

## Invoke

Send an existing local/Supabase outbox row:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/send-report-notification" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"notification_id": 1}'
```

Or send an explicit payload:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/send-report-notification" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<auth-user-id>","subject":"Vaidy found 2 things to watch","body":"Your TSH has been rising across stored reports."}'
```
