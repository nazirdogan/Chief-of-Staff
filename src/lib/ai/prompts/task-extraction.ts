export const TASK_EXTRACTION_PASS1_PROMPT = `You are scanning a sent email for tasks — promises the sender made OR requests directed at the sender.

OUTBOUND tasks (promises the sender made):
- "I'll send this over by Friday" → outbound task
- "Let me check and get back to you" → outbound task
- "I'll introduce you to James" → outbound task
- "We'll have this ready by end of month" → outbound task
- "I can do that" → outbound task (implied)
- "I'll think about it" → borderline — flag it

INBOUND tasks (requests directed at the sender):
- "Can you send me the report by Friday?" → inbound task
- "Please review the attached proposal" → inbound task
- "We need your sign-off on this" → inbound task
- "Could you set up a meeting with the team?" → inbound task

NOT tasks:
- "Sounds good" → NOT a task (acknowledgment only)
- "Thanks for the update" → NOT a task
- General discussion without action items → NOT tasks

Return JSON:
{
  "has_tasks": true/false,
  "potential_tasks": [
    {
      "exact_quote": "<copy the EXACT sentence(s) from the email>",
      "task_type": "deliverable" | "follow_up" | "introduction" | "response",
      "to_person": "<recipient name if identifiable>",
      "direction": "outbound" | "inbound"
    }
  ]
}

If no tasks found, return { "has_tasks": false, "potential_tasks": [] }
Respond ONLY with JSON.`;

export const TASK_SCORING_PASS2_PROMPT = `You are scoring a potential task extracted from a sent email.

Return a JSON confidence assessment:
{
  "confidence_score": <1-10>,
  "task_interpretation": "<plain English description: 'Send the proposal to James by Friday'>",
  "has_explicit_deadline": <true/false>,
  "implied_deadline": "<YYYY-MM-DD if inferable, null if not>",
  "reasoning": "<why you scored it this way>"
}

Scoring guide:
10: Explicit promise with named deadline and specific deliverable ("I'll send the contract by Thursday 5pm")
8-9: Clear promise with deadline or specific deliverable
6-7: Probable promise, less specific
4-5: Possible promise, ambiguous language
1-3: Unlikely to be a real task

Respond ONLY with JSON.`;

export const TASK_EXTRACTION_SLACK_PROMPT = `You are scanning a Slack message sent by the user for tasks — promises made OR requests received.

OUTBOUND tasks (promises made):
- "I'll send this over by Friday" → outbound task
- "Let me check and get back to you" → outbound task
- "I'll handle that" → outbound task
- "Will get the PR merged today" → outbound task

INBOUND tasks (requests received):
- "Can you review this PR?" → inbound task
- "Please update the docs" → inbound task
- "Need you to fix the deployment" → inbound task

NOT tasks:
- "sounds good" → NOT a task (acknowledgment only)
- "thanks" → NOT a task
- "lol" → NOT a task

Return JSON:
{
  "has_tasks": true/false,
  "potential_tasks": [
    {
      "exact_quote": "<copy the EXACT text from the message>",
      "task_type": "deliverable" | "follow_up" | "introduction" | "response",
      "to_person": "<recipient name if identifiable>",
      "direction": "outbound" | "inbound"
    }
  ]
}

If no tasks found, return { "has_tasks": false, "potential_tasks": [] }
Respond ONLY with JSON.`;

export const TASK_EXTRACTION_CALENDAR_PROMPT = `You are scanning a calendar event description/notes for tasks the user may have made or received.
Look for action items, promises, or follow-ups mentioned in meeting notes or event descriptions.

Examples:
- "Action: Send revised proposal to client by EOD Friday" → outbound task
- "Follow up with legal on contract terms" → outbound task
- "Need to share deck with team before next meeting" → outbound task
- "Client requested updated pricing by Monday" → inbound task
- "Discussed roadmap priorities" → NOT a task (observation only)
- "Meet at the usual place" → NOT a task

Return JSON:
{
  "has_tasks": true/false,
  "potential_tasks": [
    {
      "exact_quote": "<copy the EXACT text>",
      "task_type": "deliverable" | "follow_up" | "introduction" | "response",
      "to_person": "<person name if identifiable>",
      "direction": "outbound" | "inbound"
    }
  ]
}

If no tasks found, return { "has_tasks": false, "potential_tasks": [] }
Respond ONLY with JSON.`;

export const TASK_RESOLUTION_PROMPT = `You are checking whether a sent message resolves an existing task.

You will receive:
1. An OPEN TASK the user previously committed to
2. A SENT MESSAGE the user recently sent

Determine if the sent message fulfills or resolves the task. Consider:
- Did the user deliver what they promised?
- Did the user explicitly follow up on the task?
- Did the user send the document/information they committed to?

Return JSON:
{
  "resolves_task": true/false,
  "confidence": <1-10>,
  "reasoning": "<why you believe this does or doesn't resolve the task>"
}

Only mark as resolved if confidence >= 7.
Respond ONLY with JSON.`;

export const TASK_EXTRACTION_DESKTOP_PROMPT = `You are scanning text from a user's communication session (email compose, Slack message, chat) for tasks they are making or receiving.
Focus on both outbound messages (promises the user is making) and inbound messages (requests directed at the user).

Return JSON:
{
  "has_tasks": true/false,
  "potential_tasks": [
    {
      "exact_quote": "<the exact task text>",
      "task_type": "deliverable" | "follow_up" | "introduction" | "response",
      "to_person": "<recipient name if identifiable>",
      "direction": "outbound" | "inbound"
    }
  ]
}

If no tasks found, return { "has_tasks": false, "potential_tasks": [] }
Respond ONLY with JSON.`;

// Legacy aliases for backward compatibility during transition
export const COMMITMENT_EXTRACTION_PASS1_PROMPT = TASK_EXTRACTION_PASS1_PROMPT;
export const COMMITMENT_SCORING_PASS2_PROMPT = TASK_SCORING_PASS2_PROMPT;
export const COMMITMENT_EXTRACTION_SLACK_PROMPT = TASK_EXTRACTION_SLACK_PROMPT;
export const COMMITMENT_EXTRACTION_CALENDAR_PROMPT = TASK_EXTRACTION_CALENDAR_PROMPT;
export const COMMITMENT_RESOLUTION_PROMPT = TASK_RESOLUTION_PROMPT;
export const COMMITMENT_EXTRACTION_DESKTOP_PROMPT = TASK_EXTRACTION_DESKTOP_PROMPT;
