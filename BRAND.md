# Worthiness Architect: Brand Guidelines

## The idea

**Worth is the foundation, not the reward.**

Most people with a self-worth wound treat their value like a building they have to keep renovating: perform better, please more people, never slip. This product's job is to show them their worth was never the façade. It's the foundation, the part that stays put whatever happens on the surface.

The organizing metaphor is architecture, specifically the **keystone**: the wedge-shaped stone at the top of an arch that holds every other stone in place. Take it out and the arch falls; it isn't decoration. Everything in the identity comes from this.

### Positioning
For people whose sense of worth depends on performance, approval or productivity, Worthiness Architect is a calm, honest reflection tool that finds the hidden rules underneath painful thoughts and builds evidence against them. Unlike affirmation apps, it never flatters. Unlike generic AI chat, it remembers your patterns and measures change.

### Brand line and secondary line
- Primary: **Worth is the foundation, not the reward.**
- Secondary, in the logo lockup: **Foundations, not façades.**

## Voice

| We are | We are not |
|---|---|
| Calm | Clinical |
| Plain | Jargon-heavy ("cognitive defusion protocol") |
| Warm | Gushing ("You're amazing!") |
| Direct | Preachy |
| Honest about limits | Promising cures |

Rules:
1. **No hype, ever.** Unearned praise bounces off a wounded brain. Ground every sentence in something true.
2. **Separate the person from the event**, in our copy too: "Something didn't go well," never "You failed."
3. **Short sentences, everyday words.** Use technical terms (CBT, IFS) only when crediting the method, never as UI labels.
4. **Invite, don't instruct.** "Try one," "When you're ready," "Let it go," not "Complete your daily task."
5. **Name limits plainly.** "A reflection tool, not therapy" appears everywhere, in that wording.

Example rewrites from the refresh:
- "Shame-to-Guilt & Conditional Worth Deconstructor" → **"What is your inner critic saying?"**
- "Prescribed Micro-Rep of Self-Worth" → **"One small rep"**
- "Your Grounded, Dignified Truth" → **"A truer sentence"**
- "Worth Ledger" → **"Evidence: proof you already count"**

## Logo

The mark is an **arch with its keystone**. The two halves of the arch, in Evergreen, rise toward a Clay keystone that locks them together. There's a deliberate gap where the keystone sits: the structure only works because of it.

- **Wordmark:** "Worthiness *Architect*" in Fraunces, with "Architect" in italic for warmth.
- **Lockup:** mark + wordmark + the secondary line in small caps (header). Compact lockup drops the line (phones).
- **App icon / favicon:** Ivory arch with a Clay keystone on an Evergreen tile (`public/favicon.svg`, `public/apple-touch-icon.png`).
- **Clear space:** at least the keystone's height on every side.
- **Don't:** recolor the keystone in Evergreen, close the gap, rotate the mark, or put it on a busy photo.

## Color

All colors are semantic CSS variables in `src/index.css`, with a dark-mode set that was chosen separately, not auto-inverted.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` Sandstone | `#F3EFE6` | `#111714` | Page |
| `--surface` Ivory | `#FCFAF5` | `#19211D` | Cards, dialogs |
| `--sunken` Mortar | `#ECE6DA` | `#141B18` | Inputs, wells |
| `--ink` | `#1C2521` | `#ECE7DC` | Primary text |
| `--ink-2` / `--ink-3` | `#48524D` / `#69716C` | `#B7BCB4` / `#8F968F` | Secondary / tertiary text (both pass 4.5:1) |
| `--brand` Evergreen | `#21443A` | `#9CCBB2` | Primary actions, the "truer sentence," chart line |
| `--keystone` Clay | `#B8552F` | `#E58A5F` | The keystone, step numbers, due check-ins, focus rings. Use sparingly. |
| `--rule` Ochre | `#8A5D0B` | `#E6B95C` | Hidden rules only |
| `--danger` | `#A33A2F` | `#F0907F` | Crisis resources, destructive actions only |

**Evidence categories** use a fixed order, validated for colorblind separation and contrast in both themes, and always shown with a text label: Rest `--cat-1` green, Boundary `--cat-2` clay-red, Mistake `--cat-3` blue, Unhooked `--cat-4` ochre.

Proportions: roughly 80% Sandstone/Ivory, 15% Ink, 4% Evergreen, 1% Clay. If Clay starts to feel like a theme color, there's too much of it.

## Typography

- **Fraunces** (display, variable, SOFT 50): headlines, quotes, the user's own thoughts, numbers. Italic for anything the user said or should hear in their own voice.
- **Instrument Sans** (UI and body): everything functional.
- Scale: 60/44 hero · 40/30 page titles · 26 section · 20 card titles · 16 body · 13–15 UI · 11 eyebrow (uppercase, 0.14em tracking).
- The user's thought is always set in Fraunces italic. It's the most important text on the screen.

## Layout and form

- **Editorial structure:** numbered rows (01, 02…) with a label column on the left and content on the right, like an architectural spec sheet.
- **Surfaces:** 20px card radius, hairline borders, very soft shadows. A faint paper grain on the page gives it a printed feel.
- **One hero per screen.** On Untangle it's the Evergreen "truer sentence" card; on Today, the Untangle action.
- **Phones:** a bottom tab bar with five destinations; dialogs become bottom sheets.

## Motion

Quiet and slow. A 400ms rise on new content; the grounding ring breathes on a 10-second 4-in/6-out cycle. Nothing bounces. All motion turns off under `prefers-reduced-motion`.

## Information architecture

| Tab | Job |
|---|---|
| **Today** | Home. Greeting, due check-ins, the two ways in, your strongest pattern, commitments, self-esteem snapshot. First visit shows "How this works." |
| **Reflect** | Open conversation (the coach). |
| **Untangle** | One thought → the hidden rule → a truer sentence → one small rep. |
| **Evidence** | Log moments of self-respect; committed reps and check-ins. |
| **Insights** | Patterns ranked by frequency, plus the self-esteem trend. |

Always available: **Pause** (one-minute grounding) and **Your data** (privacy).

## Accessibility

- Text tokens meet WCAG AA in both themes. Category colors never carry meaning alone.
- Visible Clay focus rings, a skip link, `aria-current` on nav, `aria-pressed` on toggles, labeled dialogs that close with Escape.
- The chart has a hover/focus tooltip and a table equivalent.
