# Donna Voice Implementation Plan

Applies the Donna Paulson tone of voice to all user-facing AI outputs.

---

## Status

| Task | Status |
|---|---|
| `lib/ai/prompts/persona.ts` created | ✅ Done |
| Inject into `briefing.ts` | ⬜ Todo |
| Inject into `reply-draft.ts` | ⬜ Todo |
| Inject into `meeting-prep.ts` | ⬜ Todo |
| Assess `relationship.ts` | ⬜ Todo |
| Clean up `briefing.example.ts` | ⬜ Todo |
| Verify with typecheck | ⬜ Todo |

---

## What Was Already Done

`lib/ai/prompts/persona.ts` has been created and contains the `DONNA_PERSONA`
constant — a full tone-of-voice system prompt with voice rules, negative
constraints, and four calibration examples showing wrong vs right output.

**Do not modify this file yet.** Get everything integrated and tested first,
then tune it iteratively based on real outputs.

---

## Step 1 — Inject into `lib/ai/prompts/briefing.ts`

This is the highest-priority surface. The daily briefing is the primary thing
the user reads every day. Tone matters most here.

**What to do:**

1. Open `lib/ai/prompts/briefing.ts`
2. Add the import at the top:
   ```ts
   import { DONNA_PERSONA } from './persona'
   ```
3. Find the system prompt string (likely a template literal assigned to a
   `const`). Inject `${DONNA_PERSONA}` as the very first line of the prompt,
   followed by a `---` separator, then the existing task instructions:
   ```ts
   export const BRIEFING_SYSTEM_PROMPT = `
   ${DONNA_PERSONA}

   ---

   ## Your Task
   ... (existing content unchanged below this line)
   `
   ```

**Important:** Do not modify the task instructions portion of the briefing
prompt. Only prepend the persona. The task instructions define *what* to
produce; the persona defines *how* to say it.

---

## Step 2 — Inject into `lib/ai/prompts/reply-draft.ts`

Reply drafts are the second most visible surface — the user reviews these
before sending. The persona should be injected using the exact same pattern
as Step 1.

**Known limitation:** `reply-draft.ts` uses `claude-haiku-4-5-20251001` per
the model selection rules. Haiku will hold the persona reasonably well with
clear enough instructions, but it is less consistent than Sonnet at
maintaining nuanced voice across a full response.

**Decision required:** Accept this and tune the persona examples to be
simpler/more explicit, OR escalate reply drafting to Sonnet (requires a
deliberate override of the model selection rules — not recommended without
discussion). The recommended default is to accept Haiku and tune.

---

## Step 3 — Inject into `lib/ai/prompts/meeting-prep.ts`

Same pattern as Steps 1 and 2. Meeting prep briefs are read by the user
before a meeting, so tone matters. Uses Sonnet — persona will land well here.

---

## Step 4 — Assess `lib/ai/prompts/relationship.ts`

Open this file and check: does it produce prose that the user reads directly,
or does it produce structured data consumed by another agent?

- If it produces **readable prose** (e.g. a "relationship summary" card the
  user sees in the People view) → inject `DONNA_PERSONA` using the same pattern.
- If it produces **structured JSON / data objects** → do not inject. Leave
  it unchanged.

---

## Step 5 — Clean Up

Delete `lib/ai/prompts/briefing.example.ts`. This was a reference stub showing
the integration pattern and is no longer needed once Steps 1–3 are done.

```bash
rm lib/ai/prompts/briefing.example.ts
```

---

## Step 6 — Verify

Run the typecheck to confirm nothing broke:

```bash
npm run typecheck
```

The only expected changes are the new import lines in the prompt files. There
should be zero type errors introduced by this change.

---

## Step 7 — Test Output Quality

Trigger a briefing generation against real or seed data and read the output.
Check against these questions:

- Does it lead with one clear priority, stated as a fact?
- Are sentences short? Is there zero hedging?
- Is there no "Certainly!", "I've noticed", or "Is there anything else"?
- Does it feel like a trusted advisor, not a generic assistant?

If any of these fail, the fix is in `persona.ts` — specifically the calibration
examples. Add more wrong/right pairs that demonstrate the failure case you're
seeing. Do not touch the task instruction portions of the individual prompts.

---

## What NOT to Touch

| File | Reason |
|---|---|
| `lib/ai/prompts/commitment-extraction.ts` | Extraction only — produces structured data, not prose |
| `lib/ai/agents/ingestion.ts` | Pass 1 ingestion — output is internal, never user-facing |
| Any route handler or API file | Tone lives in prompts only, not in request/response logic |
| `lib/ai/models.ts` | Model selection rules are separate from tone |

---

## Tuning After First Run

The persona will likely need one round of tuning after you see real outputs.
The most common issues and fixes:

| Issue | Fix |
|---|---|
| Model still uses filler phrases | Add the specific phrase to the "You never" list in `persona.ts` |
| Tone too cold / clinical | Strengthen the "warm but not soft" examples in the calibration section |
| Tone too casual for a serious item | Add a calibration example showing how to handle urgent/bad news |
| Haiku outputs are inconsistent | Simplify the persona — fewer rules, more examples |

All fixes go in `persona.ts`. One file, propagates everywhere.
