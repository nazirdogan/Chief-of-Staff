# Chief of Staff — AI Agent Pipeline

All agent code lives in `lib/ai/agents/`. All prompts live in `lib/ai/prompts/`.
All agents import models from `lib/ai/models.ts` — never hardcode model strings.

---

## Agent Overview

```
Trigger.dev (Heartbeat)
    │
    ├── Ingestion Agents (x1 per provider)
    │       └── Writes to: inbox_items, document_chunks, contact_interactions
    │
    ├── Commitment Extraction Agent
    │       └── Reads: inbox_items (sent/outbound)
    │       └── Writes: commitments
    │
    ├── Relationship Agent
    │       └── Reads: contact_interactions, commitments
    │       └── Writes: contacts (scores, cold flags)
    │
    └── Briefing Orchestrator (runs daily at briefing_time)
            ├── Reads from all above
            ├── Calls: Prioritisation Agent
            ├── Calls: Meeting Prep Agent (for each today's event)
            └── Writes: briefings, briefing_items
```

---

## 1. Ingestion Agent

**File**: `lib/ai/agents/ingestion.ts`  
**Model**: `AI_MODELS.FAST` (Haiku)  
**Trigger**: Heartbeat schedule per user per provider

```typescript
import { AI_MODELS } from '@/lib/ai/models';
import { sanitiseContent, buildSafeAIContext } from '@/lib/ai/safety/sanitise';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function ingestGmailMessages(
  userId: string,
  messages: GmailMessage[]
): Promise<InboxItem[]> {
  const results: InboxItem[] = [];

  for (const message of messages) {
    // ALWAYS sanitise before sending to AI
    const { content: safeBody } = sanitiseContent(
      message.body ?? message.snippet,
      `gmail:${message.id}`
    );

    const context = buildSafeAIContext(
      INGESTION_PROMPT,
      [{ label: 'email', content: safeBody, source: `gmail:${message.id}` }]
    );

    const response = await anthropic.messages.create({
      model: AI_MODELS.FAST,
      max_tokens: 300,
      messages: [{ role: 'user', content: context }],
    });

    const summary = extractText(response.content);

    results.push({
      provider: 'gmail',
      external_id: message.id,
      thread_id: message.threadId,
      from_email: message.from,
      from_name: message.fromName,
      subject: message.subject,
      ai_summary: summary,     // summary stored — raw body NEVER stored
      urgency_score: extractUrgencyScore(summary),
      needs_reply: detectNeedsReply(summary),
      received_at: message.date,
    });
  }

  return results;
}
```

### Ingestion Prompt
**File**: `lib/ai/prompts/briefing.ts`

```typescript
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
```

---

## 2. Commitment Extraction Agent

**File**: `lib/ai/agents/commitment.ts`  
**Pass 1 Model**: `AI_MODELS.FAST` (Haiku) — high recall, low precision  
**Pass 2 Model**: `AI_MODELS.STANDARD` (Sonnet) — accurate confidence scoring

```typescript
export async function extractCommitments(
  userId: string,
  sentMessages: SentMessage[]
): Promise<CommitmentRecord[]> {
  const candidates: CommitmentCandidate[] = [];

  // PASS 1: Fast extraction — flag everything that might be a commitment
  for (const message of sentMessages) {
    const { content: safeBody } = sanitiseContent(
      message.body,
      `${message.provider}:${message.id}`
    );

    const context = buildSafeAIContext(
      COMMITMENT_EXTRACTION_PASS1_PROMPT,
      [{ label: 'sent_message', content: safeBody, source: `${message.provider}:${message.id}` }]
    );

    const response = await anthropic.messages.create({
      model: AI_MODELS.FAST,
      max_tokens: 500,
      messages: [{ role: 'user', content: context }],
    });

    const extracted = JSON.parse(extractText(response.content));
    if (extracted.potential_commitments?.length > 0) {
      candidates.push({
        message,
        potentialCommitments: extracted.potential_commitments,
      });
    }
  }

  // PASS 2: Confidence scoring — only run on flagged items
  const confirmed: CommitmentRecord[] = [];

  for (const candidate of candidates) {
    for (const potential of candidate.potentialCommitments) {
      const context = buildSafeAIContext(
        COMMITMENT_SCORING_PASS2_PROMPT,
        [{
          label: 'potential_commitment',
          content: JSON.stringify(potential),
          source: `${candidate.message.provider}:${candidate.message.id}`,
        }]
      );

      const response = await anthropic.messages.create({
        model: AI_MODELS.STANDARD,
        max_tokens: 400,
        messages: [{ role: 'user', content: context }],
      });

      const scored = JSON.parse(extractText(response.content));

      // Only surface commitments scoring 6+ (medium and high confidence)
      if (scored.confidence_score >= 6) {
        confirmed.push({
          recipient_email: candidate.message.to,
          recipient_name: candidate.message.toName,
          commitment_text: scored.commitment_interpretation,
          source_quote: potential.exact_quote,        // REQUIRED: exact sentence
          source_ref: {
            provider: candidate.message.provider,
            message_id: candidate.message.id,
            thread_id: candidate.message.threadId,
            sent_at: candidate.message.date,
          },
          confidence: scored.confidence_score >= 8 ? 'high' : 'medium',
          confidence_score: scored.confidence_score,
          implied_deadline: scored.implied_deadline ?? null,
          explicit_deadline: scored.has_explicit_deadline ?? false,
        });
      }
    }
  }

  return confirmed;
}
```

### Commitment Extraction Prompts
**File**: `lib/ai/prompts/commitment-extraction.ts`

```typescript
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
```

---

## 3. Prioritisation Agent

**File**: `lib/ai/agents/prioritisation.ts`  
**Model**: `AI_MODELS.STANDARD` (Sonnet)

Scores each candidate briefing item across 5 dimensions:

| Dimension | Description | Weight |
|---|---|---|
| Urgency | Time sensitivity — deadline today or overdue | 30% |
| Importance | Strategic impact — involves VIP or key project | 25% |
| Commitment Risk | Is an open commitment at risk | 20% |
| Relationship Risk | Is a key relationship going cold | 15% |
| Effort | Quick win (low effort = higher priority) | 10% |

```typescript
export async function prioritiseItems(
  userId: string,
  candidates: BriefingItemCandidate[],
  userContext: UserContext
): Promise<RankedBriefingItem[]> {
  // Score each item
  const scored = candidates.map(item => ({
    ...item,
    urgency_score: scoreUrgency(item, userContext),
    importance_score: scoreImportance(item, userContext),
    risk_score: scoreRisk(item, userContext),
    composite_score:
      scoreUrgency(item, userContext) * 0.30 +
      scoreImportance(item, userContext) * 0.25 +
      scoreRisk(item, userContext) * 0.35 +
      scoreEffort(item) * 0.10,
  }));

  // Sort by composite score
  scored.sort((a, b) => b.composite_score - a.composite_score);

  // Generate reasoning for top items using AI
  // (reasoning explains WHY it was ranked here — shown in UI)
  return generateReasoning(scored, userContext);
}

function scoreImportance(item: BriefingItemCandidate, ctx: UserContext): number {
  let score = 5;
  // VIP contact — big boost
  if (ctx.vipEmails.includes(item.from_email)) score += 3;
  // Active project mentioned — boost
  if (ctx.activeProjects.some(p =>
    item.subject?.toLowerCase().includes(p.toLowerCase()) ||
    item.summary?.toLowerCase().includes(p.toLowerCase())
  )) score += 2;
  return Math.min(score, 10);
}
```

---

## 4. Meeting Prep Agent

**File**: `lib/ai/agents/meeting-prep.ts`  
**Model**: `AI_MODELS.STANDARD` (Sonnet)

Every claim in the output MUST have a source_ref. The citation validator is called before any output is written.

```typescript
export const MEETING_PREP_PROMPT = `You are generating a pre-meeting brief for a professional.
You have access to recent communications with the attendees and relevant documents.

Generate a meeting prep brief in this EXACT JSON structure:
{
  "summary": "<2-3 sentence context summary>",
  "attendee_context": [
    {
      "name": "<attendee name>",
      "relationship_note": "<last interaction, tone, anything notable>",
      "source_ref": { "provider": "...", "message_id": "...", "excerpt": "...", "sent_at": "..." }
    }
  ],
  "open_items": [
    {
      "description": "<what's outstanding between you>",
      "source_ref": { "provider": "...", "message_id": "...", "excerpt": "...", "sent_at": "..." }
    }
  ],
  "suggested_talking_points": ["...", "..."],
  "watch_out_for": "<anything the person should be careful about>"
}

CRITICAL RULES:
1. Every attendee_context item MUST have a source_ref citing a specific message
2. Every open_items entry MUST have a source_ref
3. If you cannot find evidence for a claim, DO NOT include the claim
4. Never invent or infer facts — only state what is directly evidenced in the provided context
5. Respond ONLY with JSON`;
```

---

## 5. Briefing Orchestrator

**File**: `lib/ai/agents/briefing.ts`  
**Model**: `AI_MODELS.STANDARD` (Sonnet)  
**Trigger**: Trigger.dev scheduled job at `profiles.briefing_time` per user timezone

```typescript
export async function generateDailyBriefing(userId: string): Promise<Briefing> {
  const [
    inboxItems,
    commitments,
    todaysEvents,
    coldContacts,
    userContext,
  ] = await Promise.all([
    getUnresolvedInboxItems(userId),
    getOpenCommitments(userId),
    getTodaysCalendarEvents(userId),
    getColdContacts(userId),
    getUserContext(userId),   // vip list, active projects, preferences
  ]);

  // Build candidate items for all sections
  const candidates: BriefingItemCandidate[] = [
    ...inboxItems.map(mapInboxItemToCandidate),
    ...commitments.map(mapCommitmentToCandidate),
    ...todaysEvents.map(mapEventToCandidate),
    ...coldContacts.map(mapColdContactToCandidate),
  ];

  // Prioritise and rank
  const ranked = await prioritiseItems(userId, candidates, userContext);

  // Generate meeting prep for each today's event
  const meetingPreps = await Promise.all(
    todaysEvents.map(event => generateMeetingPrep(userId, event))
  );

  // Build sections
  const sections = buildBriefingSections(ranked, meetingPreps);

  // Validate every item has a source_ref before writing to DB
  for (const item of sections.flatMap(Object.values)) {
    validateBriefingItem(item);   // throws if no source_ref or reasoning
  }

  // Write to database
  return saveBriefing(userId, sections);
}
```

---

## 6. Reply Draft Agent

**File**: `lib/ai/agents/reply-draft.ts`  
**Model**: `AI_MODELS.FAST` (Haiku)

```typescript
export const REPLY_DRAFT_PROMPT = `You are drafting an email reply on behalf of a professional.
Write in their voice — use the style and tone from their past emails provided below.

Rules:
1. Match the length and formality of the original email
2. Be direct — don't pad with unnecessary pleasantries
3. If instruction says "be brief", keep to 2-3 sentences
4. Address the specific question or request
5. End with a clear next step or action
6. Do NOT invent facts or commitments you weren't instructed to make
7. Return ONLY the email body text, no subject line, no salutation unless specifically requested`;
```

All drafts create a `pending_actions` record with status `awaiting_confirmation`.
The draft is NEVER sent until the user explicitly confirms.

---

## 7. Relationship Agent

**File**: `lib/ai/agents/relationship.ts`  
**Model**: `AI_MODELS.FAST` (Haiku)  
**Trigger**: Weekly Heartbeat job

```typescript
// Relationship temperature scoring
// Runs weekly for all contacts with interaction_count_30d > 0

export function calculateRelationshipScore(contact: Contact): number {
  const daysSinceContact = daysBetween(contact.last_interaction_at, new Date());
  const frequency = contact.interaction_count_30d;

  let score = 50; // baseline

  // Recency (0-40 points)
  if (daysSinceContact <= 3) score += 40;
  else if (daysSinceContact <= 7) score += 30;
  else if (daysSinceContact <= 14) score += 20;
  else if (daysSinceContact <= 30) score += 10;
  else score -= 10;

  // Frequency (0-30 points)
  score += Math.min(frequency * 3, 30);

  // VIP bonus (0-20 points)
  if (contact.is_vip) score += 20;

  return Math.max(0, Math.min(100, score));
}

export function shouldFlagCold(contact: Contact): boolean {
  if (!contact.is_vip && contact.relationship_score < 30) return true;
  if (contact.is_vip && contact.relationship_score < 50) return true;   // higher bar for VIPs
  return false;
}
```

---

## Trigger.dev Job Definitions

**File**: `trigger/briefing/generate-daily-briefing.ts`

```typescript
import { schedules } from '@trigger.dev/sdk/v3';
import { generateDailyBriefing } from '@/lib/ai/agents/briefing';
import { sendTelegramMessage, formatBriefingForTelegram } from '@/lib/integrations/telegram';

// This job is triggered per user at their configured briefing_time
export const dailyBriefingJob = schedules.task({
  id: 'daily-briefing-generate',
  maxDuration: 120,  // 2 minute timeout
  run: async (payload: { userId: string }) => {
    const briefing = await generateDailyBriefing(payload.userId);

    // Deliver via configured channel
    const profile = await getProfile(payload.userId);
    if (profile.primary_channel === 'telegram' && profile.telegram_chat_id) {
      const message = formatBriefingForTelegram(briefing);
      await sendTelegramMessage(profile.telegram_chat_id, message);
    }

    return { briefing_id: briefing.id, item_count: briefing.item_count };
  },
});
```

**File**: `trigger/heartbeat/gmail-scan.ts`

```typescript
import { schedules } from '@trigger.dev/sdk/v3';

// Runs on the user's configured Heartbeat frequency
export const gmailScanJob = schedules.task({
  id: 'heartbeat-gmail-scan',
  maxDuration: 60,
  run: async (payload: { userId: string }) => {
    const { fetchInboxMessages, fetchMessageForProcessing } = await import('@/lib/integrations/gmail');
    const { ingestGmailMessages } = await import('@/lib/ai/agents/ingestion');

    const messages = await fetchInboxMessages(payload.userId, 50);
    const processed = await ingestGmailMessages(payload.userId, messages);

    // Check for VIP messages and send immediate alert if found
    const vipAlerts = processed.filter(m => m.urgency_score >= 8);
    if (vipAlerts.length > 0) {
      await sendVIPAlert(payload.userId, vipAlerts);
    }

    return { processed: processed.length, vip_alerts: vipAlerts.length };
  },
});
```
