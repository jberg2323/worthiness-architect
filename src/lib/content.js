// Product copy and fixed content. Voice: calm, plain, warm, direct. No hype. See BRAND.md.

export const DAY_MS = 86400000;
export const PATTERN_WINDOW_MS = 30 * DAY_MS;
export const RETAKE_INTERVAL_MS = 14 * DAY_MS;

// Client-side backstop so crisis resources appear even if the AI call fails
export const CRISIS_PATTERN = /\b(suicid\w*|kill(ing)? myself|end(ing)? (my|it all|my life)|want(ed)? to die|wish i (was|were) dead|better off dead|no reason to (live|go on)|self[- ]?harm\w*|hurt(ing)? myself|cut(ting)? myself|harm(ing)? myself)\b/i;

export const TAGLINE = "Worth is the foundation, not the reward.";

export const QUICK_STARTERS = [
  {
    label: "I made a mistake and now I feel like a failure",
    prompt: "I made a mistake recently and now I'm spiraling into feeling like I'm completely incompetent and a failure as a person.",
    tag: "After a mistake"
  },
  {
    label: "Someone's upset with me and I can't settle",
    prompt: "Someone is unhappy or disappointed with me right now, and my chest feels tight. I feel like a bad person unless everyone approves of me.",
    tag: "Approval"
  },
  {
    label: "I feel guilty for resting",
    prompt: "I'm trying to rest or take a break today, but a loud voice in my head is telling me I'm lazy and falling behind. I feel like I haven't earned the right to relax.",
    tag: "Rest"
  },
  {
    label: "Help me find a rule I live by",
    prompt: "I want to do a proactive deep-dive to uncover and dismantle a hidden rule I carry about what makes me worthy of respect and belonging.",
    tag: "Go deeper"
  }
];

export const UNTANGLE_EXAMPLES = [
  "I bombed the presentation today. Everyone probably realizes I don't belong in this role and I'm a total fraud.",
  "My friend hasn't texted me back in two days. I must have said something annoying and ruined things.",
  "I spent the whole weekend exhausted on the couch instead of catching up on chores. I'm so undisciplined and useless.",
  "I said 'no' to helping my coworker with their project, and now I feel selfish and guilty."
];

// Fixed categorical order; colors validated for CVD + contrast in both themes (see BRAND.md)
export const EVIDENCE_CATEGORIES = [
  {
    id: "rested",
    label: "Rested without apology",
    short: "Rest",
    dot: "bg-cat-1",
    description: "Listened to tiredness instead of demanding output first."
  },
  {
    id: "boundary",
    label: "Held a boundary",
    short: "Boundary",
    dot: "bg-cat-2",
    description: "Let someone be disappointed to protect my own capacity."
  },
  {
    id: "mistake",
    label: "Met a mistake with kindness",
    short: "Mistake",
    dot: "bg-cat-3",
    description: "Owned what happened without attacking who I am."
  },
  {
    id: "unhooked",
    label: "Unhooked worth from output",
    short: "Unhooked",
    dot: "bg-cat-4",
    description: "Separated my value from grades, praise, or numbers."
  }
];

export const validCategory = (category) =>
  (EVIDENCE_CATEGORIES.some(c => c.id === category) ? category : 'unhooked');

export const categoryFor = (id) =>
  EVIDENCE_CATEGORIES.find(c => c.id === id) || EVIDENCE_CATEGORIES[3];

export const EXAMPLE_EVIDENCE = [
  {
    id: "seed-1",
    category: "mistake",
    title: "Separated a rough meeting from my identity",
    reflection: "Instead of calling myself an idiot all evening after stumbling over my words, I reminded myself: 'I had an awkward 10 minutes. My right to respect hasn't changed.'",
    source: "Example",
    completed: true,
    createdAt: Date.now() - DAY_MS * 2
  },
  {
    id: "seed-2",
    category: "rested",
    title: "Closed my laptop at 6 PM with tasks unfinished",
    reflection: "Part of me wanted to keep grinding so I'd feel 'safe' from criticism. I rested anyway, because rest isn't something I have to earn.",
    source: "Example",
    completed: true,
    createdAt: Date.now() - DAY_MS
  }
];

// When to check in on a committed micro-rep
export const CHECKIN_OPTIONS = [
  { id: 'hour', label: 'In an hour', getDue: () => Date.now() + 3600000 },
  {
    id: 'tonight',
    label: 'Tonight',
    getDue: () => {
      const d = new Date();
      d.setHours(20, 0, 0, 0);
      return d.getTime() > Date.now() ? d.getTime() : Date.now() + 2 * 3600000;
    }
  },
  {
    id: 'tomorrow',
    label: 'Tomorrow morning',
    getDue: () => {
      const d = new Date(Date.now() + DAY_MS);
      d.setHours(9, 0, 0, 0);
      return d.getTime();
    }
  }
];

// Rosenberg Self-Esteem Scale (Rosenberg, 1965). Reverse-scored items are marked `reversed`.
export const RSES_ITEMS = [
  { text: "On the whole, I am satisfied with myself.", reversed: false },
  { text: "At times I think I am no good at all.", reversed: true },
  { text: "I feel that I have a number of good qualities.", reversed: false },
  { text: "I am able to do things as well as most other people.", reversed: false },
  { text: "I feel I do not have much to be proud of.", reversed: true },
  { text: "I certainly feel useless at times.", reversed: true },
  { text: "I feel that I'm a person of worth, at least on an equal plane with others.", reversed: false },
  { text: "I wish I could have more respect for myself.", reversed: true },
  { text: "All in all, I am inclined to feel that I am a failure.", reversed: true },
  { text: "I take a positive attitude toward myself.", reversed: false }
];
export const RSES_OPTIONS = ["Strongly agree", "Agree", "Disagree", "Strongly disagree"];

// Option index 0 = Strongly agree. Positive items score 3..0, reversed items 0..3; total 0–30.
export const scoreRses = (answers) =>
  answers.reduce((sum, a, i) => sum + (RSES_ITEMS[i].reversed ? a : 3 - a), 0);

export const describeRses = (score) => {
  if (score < 15) return "Lower range";
  if (score <= 25) return "Typical range";
  return "Higher range";
};

// Welcome and error messages are UI-only: they aren't sent to the model or saveable
export const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'model',
  kind: 'welcome',
  text: "Take a breath. Let your shoulders drop an inch.\n\nThere's no hype here and no pep talk. We'll look honestly at the places where your worth started to feel conditional: on what you produce, how well you perform, or whether everyone is happy with you.\n\nWhat's pulling at you today?",
  timestamp: Date.now()
};

export const RESET_MESSAGE = {
  id: 'welcome-reset',
  role: 'model',
  kind: 'welcome',
  text: "A clean page. Before anything else, notice your breathing for a moment.\n\nWhat thought, mistake, or conversation is tugging at your sense of worth right now?"
};

export const ERROR_MESSAGE_TEXT =
  "I couldn't reach the AI just now. While we wait, notice what your inner critic is saying, and see if you can hold the discomfort of this moment apart from your worth as a person. Try sending your message again in a minute.";
