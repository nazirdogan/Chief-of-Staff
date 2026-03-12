export const COMMITMENT_EXTRACTION_PASS1_PROMPT = `You are scanning a sent email for commitments.
A commitment is any statement where the sender promises to do something.

Examples of commitments:
- "I'll send this over by Friday" → commitment
- "Let me check and get back to you" → commitment
- "I'll introduce you to James" → commitment
- "We'll have this ready by end of month" → commitment
- "I can do that" → commitment (implied)
- "Sounds good" → NOT a commitment (acknowledgment only)
- "I'll think about it" → borderline — flag it

Return JSON:
{
  "has_commitments": true/false,
  "potential_commitments": [
    {
      "exact_quote": "<copy the EXACT sentence(s) from the email>",
      "commitment_type": "deliverable" | "follow_up" | "introduction" | "response",
      "to_person": "<recipient name if identifiable>"
    }
  ]
}

If no commitments found, return { "has_commitments": false, "potential_commitments": [] }
Respond ONLY with JSON.`;

export const COMMITMENT_SCORING_PASS2_PROMPT = `You are scoring a potential commitment extracted from a sent email.

Return a JSON confidence assessment:
{
  "confidence_score": <1-10>,
  "commitment_interpretation": "<plain English description: 'Send the proposal to James by Friday'>",
  "has_explicit_deadline": <true/false>,
  "implied_deadline": "<YYYY-MM-DD if inferable, null if not>",
  "reasoning": "<why you scored it this way>"
}

Scoring guide:
10: Explicit promise with named deadline and specific deliverable ("I'll send the contract by Thursday 5pm")
8-9: Clear promise with deadline or specific deliverable
6-7: Probable promise, less specific
4-5: Possible promise, ambiguous language
1-3: Unlikely to be a real commitment

Respond ONLY with JSON.`;

export const COMMITMENT_EXTRACTION_SLACK_PROMPT = `You are scanning a Slack message sent by the user for commitments.
A commitment is any statement where the sender promises to do something.

Examples of commitments:
- "I'll send this over by Friday" → commitment
- "Let me check and get back to you" → commitment
- "I'll handle that" → commitment
- "Will get the PR merged today" → commitment
- "sounds good" → NOT a commitment (acknowledgment only)
- "thanks" → NOT a commitment
- "lol" → NOT a commitment

Return JSON:
{
  "has_commitments": true/false,
  "potential_commitments": [
    {
      "exact_quote": "<copy the EXACT text from the message>",
      "commitment_type": "deliverable" | "follow_up" | "introduction" | "response",
      "to_person": "<recipient name if identifiable>"
    }
  ]
}

If no commitments found, return { "has_commitments": false, "potential_commitments": [] }
Respond ONLY with JSON.`;

export const COMMITMENT_EXTRACTION_CALENDAR_PROMPT = `You are scanning a calendar event description/notes for commitments the user may have made.
Look for action items, promises, or follow-ups mentioned in meeting notes or event descriptions.

Examples:
- "Action: Send revised proposal to client by EOD Friday" → commitment
- "Follow up with legal on contract terms" → commitment
- "Need to share deck with team before next meeting" → commitment
- "Discussed roadmap priorities" → NOT a commitment (observation only)
- "Meet at the usual place" → NOT a commitment

Return JSON:
{
  "has_commitments": true/false,
  "potential_commitments": [
    {
      "exact_quote": "<copy the EXACT text>",
      "commitment_type": "deliverable" | "follow_up" | "introduction" | "response",
      "to_person": "<person name if identifiable>"
    }
  ]
}

If no commitments found, return { "has_commitments": false, "potential_commitments": [] }
Respond ONLY with JSON.`;

export const COMMITMENT_RESOLUTION_PROMPT = `You are checking whether a sent message resolves an existing commitment.

You will receive:
1. An OPEN COMMITMENT the user previously made
2. A SENT MESSAGE the user recently sent

Determine if the sent message fulfills or resolves the commitment. Consider:
- Did the user deliver what they promised?
- Did the user explicitly follow up on the commitment?
- Did the user send the document/information they committed to?

Return JSON:
{
  "resolves_commitment": true/false,
  "confidence": <1-10>,
  "reasoning": "<why you believe this does or doesn't resolve the commitment>"
}

Only mark as resolved if confidence >= 7.
Respond ONLY with JSON.`;

export const COMMITMENT_EXTRACTION_DESKTOP_PROMPT = `You are scanning text from a user's communication session (email compose, Slack message, chat) for commitments they are making.
Focus only on outbound messages — things the user is typing/sending, not receiving.

Return JSON:
{
  "has_commitments": true/false,
  "potential_commitments": [
    {
      "exact_quote": "<the exact commitment text>",
      "commitment_type": "deliverable" | "follow_up" | "introduction" | "response",
      "to_person": "<recipient name if identifiable>"
    }
  ]
}

If no commitments found, return { "has_commitments": false, "potential_commitments": [] }
Respond ONLY with JSON.`;
