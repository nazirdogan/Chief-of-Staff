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
