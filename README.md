# The Worthiness Architect

A single-file React app (`App.jsx`) built to run in **Gemini Canvas**. Canvas provides `__firebase_config`, `__app_id`, `__initial_auth_token` and the Gemini API key at runtime. Outside Canvas, the AI calls fail, the app falls back to generic text, and nothing is saved past a reload.

## Features

- **Coach**: AI chat that remembers the user's recurring hidden rules.
- **Deconstructor**: breaks one painful thought into a structured analysis and tracks the hidden rule underneath it.
- **Patterns**: recurring hidden rules, how often each comes up (30 days), and counter-evidence logged against each.
- **Worth Ledger**: behavioral evidence entries, optionally linked to a rule. Also lists committed micro-reps.
- **Micro-rep loop**: commit, get an in-app check-in, compare the critic's prediction with what happened, and save the result to the ledger.
- **Progress**: Rosenberg Self-Esteem Scale every 14 days, plotted over time.
- **Your Data**: plain-language disclosure, export to JSON, delete everything, and a don't-save mode.
- **Safety**: crisis rule in both prompts, client-side crisis detection, persistent 988 footer. See `CLINICAL_REVIEW.md`.

## Firestore layout

All data lives under `artifacts/{appId}/users/{uid}/`:

| Collection | Document fields |
|---|---|
| `worth_ledger` | title, reflection, category, source, ruleId, completed, createdAt |
| `hidden_rules` | label, statement, createdAt, lastSeenAt |
| `rule_hits` | ruleId, thought, intensity, createdAt |
| `micro_reps` | text, ruleId, category, status (`pending`/`done`/`released`), dueAt, predicted, actual, releaseNote |
| `assessments` | answers (10 ints, 0 = strongly agree), score (0–30), createdAt |

## What Canvas can't do (needed before a real launch)

The privacy controls in the app are honest about the current setup but don't fix it. Before real users, it would need:

1. **Its own hosting and accounts.** Canvas uses anonymous auth, so data is tied to one browser with no recovery. Real sign-in (e.g. Clerk or Firebase Auth with email or passkeys) lets users keep their data across devices.
2. **A server-side AI route.** Calls currently go from the browser straight to Gemini. Proxying them through a server keeps the key private, allows rate limiting, and lets you choose a provider and plan with zero-retention or no-training terms. That's what would back a "we never train on your entries" promise. Don't make that claim until it's true.
3. **Encryption beyond Firebase's default.** Firestore encrypts at rest, but the operator can still read entries. For shame disclosures, consider per-user field-level encryption so even you can't read them.
4. **Real reminders.** Check-ins are in-app only and appear when the app is open. Push notifications or email need a backend and consent.
5. **Security rules.** Lock Firestore down to `request.auth.uid == uid` for the user's own path.
6. **A privacy policy and terms**, plus a legal check on whether health-data rules apply where you operate (e.g. US state consumer-health-data laws, GDPR special-category data).
7. **Clinical review.** Send `CLINICAL_REVIEW.md` to a licensed advisor.
