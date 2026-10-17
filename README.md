# The Worthiness Architect

A self-reflection tool for untangling conditional self-worth: a React (Vite) frontend plus two Vercel Functions that call an AI model through Vercel AI Gateway.

## Features

Five destinations (see `BRAND.md` for the full IA and design system):

- **Today**: home screen with due check-ins, the two ways in, your strongest pattern, commitments, and a self-esteem snapshot.
- **Reflect**: AI conversation that remembers your recurring hidden rules.
- **Untangle**: one painful thought broken into the verdict vs. the facts, the hidden rule, what the critic protects, a truer sentence, and one small rep you can commit to.
- **Evidence**: log moments of self-respect, optionally linked to a rule; committed reps and check-ins live here.
- **Insights**: patterns ranked by 30-day frequency with history and counter-evidence, plus the Rosenberg Self-Esteem Scale trend.
- Always available: **Pause** (one-minute breathing grounding) and **Your data** (disclosure, export, delete, don't-save mode).
- **Safety**: crisis rule in both prompts, client-side crisis detection, persistent 988 footer. See `CLINICAL_REVIEW.md`.

## Layout

| Path | What it is |
|---|---|
| `src/App.jsx` | App shell, navigation, all state and handlers |
| `src/screens/` | Today, Reflect, Untangle, Evidence, Insights |
| `src/components/ui.jsx` | Design-system primitives: logo, Button, Card, Modal, Toast… |
| `src/components/dialogs.jsx` | Crisis card, grounding, check-in, self-esteem, privacy dialogs |
| `src/lib/content.js` | All product copy and fixed content |
| `src/index.css`, `tailwind.config.js` | Brand tokens (light + dark) |
| `api/coach.js`, `api/deconstruct.js` | AI routes |
| `api/_lib/prompts.js` | All AI instructions and the deconstruction schema (server-side only) |
| `api/_lib/guard.js` | Model choice, per-IP rate limit, input limits, error mapping |

## Data

All user data lives in the browser's `localStorage` under `wa-*` keys: ledger, examples, hidden rules, rule hits, micro-reps and assessments. Nothing is stored on a server, and the API routes don't log request bodies. The trade-off is that data doesn't sync across devices and is lost if browser data is cleared.

## Running locally

```bash
npm install
vercel link          # once, to the jberg2323s-projects team
vercel env pull      # gets a short-lived VERCEL_OIDC_TOKEN for AI Gateway
npm run dev          # runs `vercel dev` (frontend and /api together)
```

## AI model and cost

- The model defaults to `google/gemini-2.5-flash`. Override it with the `AI_GATEWAY_MODEL` env var. The ID must exist in `https://ai-gateway.vercel.sh/v1/models`.
- The team is on AI Gateway's free tier, which allows only some models. Upgrading to paid credits unlocks others, such as `google/gemini-3-flash`, the model this app was originally written for.
- Auth uses Vercel OIDC automatically on deployments, so there's no API key to manage.
- The per-IP rate limit (30 requests per 10 minutes) is best-effort and per function instance. **Set an AI Gateway budget** as the real spending ceiling: `vercel ai-gateway budgets --help`.

## Still needed before a serious launch

1. **Accounts and sync**, if users want their data on more than one device. Today's browser-only storage is the most private option but the least durable.
2. **Durable rate limiting**, e.g. Upstash Redis from the Vercel Marketplace, if abuse becomes a problem.
3. **Real reminders.** Check-ins are in-app only. Push or email needs a backend and consent.
4. **A privacy policy and terms**, plus a legal check on health-data rules where you operate (e.g. US state consumer-health-data laws, GDPR special-category data).
5. **Clinical review.** Send `CLINICAL_REVIEW.md` to a licensed advisor.
