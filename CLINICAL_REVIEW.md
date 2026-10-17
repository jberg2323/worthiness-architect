# Clinical Review Packet: The Worthiness Architect

This is for a licensed clinician (psychologist, LCSW, LPC or similar) reviewing the app before it goes to real users. It lists everything the app tells users, everything it tells the AI, and the specific questions we need answered. AI instructions are in `api/_lib/prompts.js`, UI copy is in `src/lib/content.js` and the screens under `src/screens/`; the client-side safety check is `CRISIS_PATTERN` in `src/lib/content.js`.

## What the app is

A self-reflection tool for people whose sense of worth depends on performance, approval or productivity. It is **not** therapy, it does not diagnose, and it says so in a persistent footer. It has five parts:

| Area | What it does |
|---|---|
| Coach | Open-ended chat with an LLM (currently Google Gemini, via Vercel AI Gateway) using the system prompt below. Draws on CBT, ACT, IFS and Neff's self-compassion work. |
| Deconstructor | The user enters one painful thought and a distress rating (1–10). The LLM returns structured fields: shame-to-guilt translation, identity fusion, hidden rule, protector motive (IFS), grounded reframe, suggested micro-rep. |
| Patterns | Hidden rules are saved, and repeat occurrences are matched to an existing rule by the LLM. Shows frequency over 30 days, average distress, and logged counter-evidence. |
| Micro-rep loop | The user commits to a small behavior and picks a check-in time. At check-in: "Did you do it?", then "What did your critic predict?" vs. "What actually happened?" (a behavioral-experiment framing). Skipping is framed as information, not failure. |
| Progress | Rosenberg Self-Esteem Scale (10 items, 0–30), suggested every 14 days and shown as a trend. |

## Safety design (please scrutinize this most)

1. **System-prompt override** (`CRISIS_RULE` in `api/_lib/prompts.js`): if the user mentions suicidal thoughts, self-harm, wanting to die, danger or abuse, the model is told to drop the coaching protocol, respond directly and point to 988 or a trusted person.
2. **Client-side backstop** (`CRISIS_PATTERN` in `src/lib/content.js`): a keyword regex shows a crisis-resources card even if the AI fails. In the Coach it appears alongside the AI reply. In the Deconstructor it **replaces** the analysis, and the user must click "I'm safe, continue" to proceed.
3. **Persistent footer** on every screen: not therapy or emergency care, plus 988 and local emergency numbers.

Known limitations:
- The regex is English-only and misses indirect language ("I don't see the point anymore", "everyone would be better without me"). It will also fire on figures of speech ("I want to die of embarrassment").
- There's no follow-up after a crisis flag, no escalation and no human in the loop.
- Resources are US-centric. Non-US users only get "your local emergency number".
- The AI can still produce something unhelpful in a crisis. We have no evals for this yet.

## Exact AI instructions

All in `api/_lib/prompts.js`:

- Coach: `COACH_SYSTEM_PROMPT`, plus up to 5 of the user's recurring hidden rules appended as context (`buildCoachInstructions`).
- Deconstructor: `DECONSTRUCT_INSTRUCTIONS`, `buildDeconstructPrompt`, and the field descriptions in `deconstructionSchema`.

## Questions for the reviewer

**Safety**
1. Is the crisis response adequate for a consumer self-help app? What's the minimum you'd require (e.g. C-SSRS-style screening, follow-up check, region-aware resources)?
2. Should the Deconstructor refuse to run at all above a certain distress rating (say 9–10), and send the user to grounding or support instead?
3. Are there populations this app should explicitly exclude or warn: eating disorders, trauma histories, active psychosis, minors?

**Method**
4. Is mixing CBT, ACT, IFS and Brené Brown's shame/guilt distinction in one output coherent, or does it confuse users? Would you cut any of them?
5. IFS language ("protector part", "inner critic is trying to protect you"): is it appropriate to use without a trained practitioner? Any risk for users with dissociative presentations?
6. Is the "critic predicted vs. what actually happened" check-in a fair adaptation of behavioral experiments?
7. Does having an LLM name a user's "hidden rule" risk wrongly labeling a core belief? Should users confirm or edit the rule before it's saved?

**Measurement**
8. Is the RSES the right outcome measure, or would the Self-Compassion Scale (short form) or another instrument fit better? Is every 14 days reasonable?
9. The app labels scores as "lower range" (<15), "typical range" (15–25) or "higher range" (>25), with a "not a diagnosis" note. Is that wording acceptable? Should a low score trigger any additional messaging?

**Language**
10. Please flag any copy that overclaims. Wording already softened: "neurobiological evidence" became "evidence", the "Velcro/Teflon brain" line was rephrased, "Prescribed" became "Suggested", and the AI is no longer told it is a clinical psychologist.

## What we'd like from you

- Written sign-off or required changes on the safety design and the prompts.
- Permission (or not) to name you as a clinical advisor in the app and marketing.
- Ideally, a recurring review of a sample of anonymized AI outputs. User data currently lives only in each user's browser, so this would need an explicit opt-in sharing feature, consent and a data-handling plan first.
