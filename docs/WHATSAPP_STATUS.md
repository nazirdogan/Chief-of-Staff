# WhatsApp Business API — Application Status

## Current Status: Pending Application

WhatsApp delivery is planned as the secondary channel after Telegram.
Telegram is the launch channel; WhatsApp will be added when approved.

## Application Details

- **Provider**: Twilio WhatsApp Business API
- **Application URL**: https://www.twilio.com/whatsapp
- **Business Name**: Chief of Staff AI
- **Use Case**: Delivering daily intelligence briefings and enabling quick-action replies

## Steps to Complete (Manual)

1. Create a Twilio account at https://www.twilio.com
2. Navigate to Messaging > WhatsApp > Senders
3. Submit WhatsApp Business API access request
4. Once approved:
   - Create a WhatsApp Message Service
   - Configure webhook URL: `https://{APP_URL}/api/webhooks/whatsapp`
   - Submit message templates for approval:
     - Daily briefing template
     - Action confirmation template
     - Reminder template
5. Set environment variables:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_NUMBER` (format: `whatsapp:+1234567890`)

## Message Templates Needed

Templates must be pre-approved by Meta before use:

1. **daily_briefing**: "Good morning! Here's your briefing for {{1}}. You have {{2}} priority items today."
2. **action_confirmation**: "Action confirmed: {{1}}"
3. **reminder**: "Reminder: {{1}} — {{2}}"

## Timeline

- Application submitted: TBD (submit manually)
- Expected approval: 2-5 business days after submission
- Integration build: Session 13+ (after Telegram is stable)

## Notes

- Twilio sandbox can be used for testing before approval
- WhatsApp message templates have a 24-hour session window
- Outside the session window, only pre-approved templates can be sent
- All env vars are already defined as optional in `lib/config.ts` and `.env.example`
