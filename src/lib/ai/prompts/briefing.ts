export const INGESTION_PROMPT = `You are processing an email for a busy professional's AI chief of staff.

Produce a JSON response with exactly these fields:
{
  "summary": "1-2 sentence summary of what this email is about and what action if any is needed",
  "urgency_score": <1-10, where 10 = requires same-day response>,
  "needs_reply": <true/false>,
  "sentiment": "neutral" | "positive" | "urgent" | "negative",
  "key_entities": ["person names, company names, project names mentioned"]
}

Rules:
- summary must be factual, not opinionated
- urgency_score of 8+ means VIP sender or explicit deadline today
- needs_reply = true if a question was asked or response is expected
- Never include any personally identifying information beyond names already in the email
- Respond ONLY with the JSON object, no other text`;
