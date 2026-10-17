import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  doc,
  onSnapshot
} from 'firebase/firestore';
import {
  ShieldAlert,
  Compass,
  BookOpen,
  Sparkles,
  Send,
  Plus,
  CheckCircle2,
  Trash2,
  ArrowRight,
  HeartHandshake,
  Scale,
  Eye,
  Anchor,
  Feather,
  RefreshCw,
  BookmarkCheck,
  MessageSquareHeart,
  Layers,
  Wind,
  ChevronRight,
  LifeBuoy,
  Repeat,
  TrendingUp,
  BellRing,
  Lock,
  Download,
  Clock,
  Target,
  X
} from 'lucide-react';

// ==========================================
// FIREBASE INITIALIZATION & CONFIG
// ==========================================
let app = null;
let auth = null;
let db = null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'unconditional-worth-architect';

try {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    const firebaseConfig = JSON.parse(__firebase_config);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (error) {
  console.warn("Using local session fallback:", error);
}

const userCollection = (user, name) => collection(db, 'artifacts', appId, 'users', user.uid, name);

// Firestore-backed collection with an in-memory fallback. Items with `local-` ids exist only
// in this session (no Firebase, not signed in yet, a failed write, or cloud saving turned off).
function useUserCollection(user, name, cloudEnabled) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(!db);

  useEffect(() => {
    if (!user || !db) return;
    const unsubscribe = onSnapshot(
      userCollection(user, name),
      (snapshot) => {
        const fetched = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        setItems(prev => [...fetched, ...prev.filter(item => item.id.startsWith('local-'))]);
        setLoaded(true);
      },
      (err) => {
        console.warn(`Firestore listener warning (${name}):`, err);
        setLoaded(true);
      }
    );
    return () => unsubscribe();
  }, [user, name]);

  const add = async (data) => {
    if (user && db && cloudEnabled) {
      try {
        const ref = await addDoc(userCollection(user, name), data);
        return ref.id;
      } catch (err) {
        console.warn(`Saved ${name} to session memory:`, err);
      }
    }
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems(prev => [{ id, ...data }, ...prev]);
    return id;
  };

  const update = async (id, patch) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
    if (user && db && !id.startsWith('local-')) {
      try {
        await updateDoc(doc(userCollection(user, name), id), patch);
      } catch (err) {
        console.warn(`Update error (${name}):`, err);
      }
    }
  };

  const remove = async (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
    if (user && db && !id.startsWith('local-')) {
      try {
        await deleteDoc(doc(userCollection(user, name), id));
      } catch (err) {
        console.warn(`Delete error (${name}):`, err);
      }
    }
  };

  // Reads the collection fresh so nothing is missed, even documents not yet loaded
  const removeAll = async () => {
    setItems([]);
    if (user && db) {
      const snapshot = await getDocs(userCollection(user, name));
      await Promise.all(snapshot.docs.map(docSnap => deleteDoc(docSnap.ref)));
    }
  };

  return { items, loaded, add, update, remove, removeAll };
}

// ==========================================
// GEMINI API HELPER WITH EXPONENTIAL BACKOFF
// ==========================================
const apiKey = ""; // Provided by runtime environment

async function callGeminiAPI(payload, retries = 4) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const httpError = new Error(`API status ${response.status}`);
        httpError.status = response.status;
        throw httpError;
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from AI");
      return text;
    } catch (err) {
      // Only retry network errors, empty responses, rate limits, and server errors
      const retryable = !err.status || err.status === 429 || err.status >= 500;
      if (attempt === retries || !retryable) throw err;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

// ==========================================
// SYSTEM INSTRUCTIONS & CONSTANTS
// ==========================================
const DAY_MS = 86400000;
const PATTERN_WINDOW_MS = 30 * DAY_MS;
const RETAKE_INTERVAL_MS = 14 * DAY_MS;

const CRISIS_RULE = `SAFETY OVERRIDE (takes priority over everything else): If the user mentions suicidal thoughts, self-harm, wanting to die, being in danger, or being abused, stop the coaching protocol. Respond with direct, plain warmth, take what they said seriously, and encourage them to reach out right now to a crisis line (in the US, call or text 988, the Suicide & Crisis Lifeline; outside the US, a local emergency number or crisis line) or to someone they trust. Do not reframe, analyze, or minimize their distress in that case.`;

// Client-side backstop so crisis resources appear even if the AI call fails
const CRISIS_PATTERN = /\b(suicid\w*|kill(ing)? myself|end(ing)? (my|it all|my life)|want(ed)? to die|wish i (was|were) dead|better off dead|no reason to (live|go on)|self[- ]?harm\w*|hurt(ing)? myself|cut(ting)? myself|harm(ing)? myself)\b/i;

const COACH_SYSTEM_PROMPT = `You are "The Worthiness Architect"—an insightful, grounded, and compassionate reflective guide informed by Cognitive Behavioral Therapy (CBT), Acceptance and Commitment Therapy (ACT), Internal Family Systems (IFS), and Kristin Neff’s Self-Compassion framework. You are not a therapist and never claim to be one.
Your singular goal is to help the user heal their "self-worth wound"—the core belief that they are fundamentally flawed, not enough, or only valuable when they achieve, please others, or perform perfectly.

${CRISIS_RULE}

STRICT RULES OF ENGAGEMENT:
1. No Toxic Positivity or Empty Flattery: Never reply with generic hype like "You are amazing!" or "You're the best!" A wounded brain rejects unearned praise. Ground every observation in reality, shared humanity, and inherent human dignity.
2. Separate "Self" from "Behavior": Consistently catch when the user fuses their identity with their performance, mistakes, or external reception (e.g., shifting "I am a failure" to "I experienced a setback in a specific task, while my foundational worth as a person remains untouched").
3. One Question at a Time: Never overwhelm the user with a wall of questions. Ask ONE incisive, gentle question at the end of your turn to guide them deeper.
4. Keep responses warm, structured, readable, and concise (2-3 short paragraphs maximum).

YOUR 4-STEP COACHING PROTOCOL (Execute dynamically):
- Name the Trigger & the Critic: Validate the painful emotion without validating the false core belief of unworthiness. Help identify the "Inner Critic" or "Protector Part" speaking.
- Audit the Hidden Rule: Uncover the silent condition they are placing on their worth right now (e.g., "I am only allowed to take up space if nobody is upset with me" or "My value equals my output today").
- The Compassionate Reframe: Guide them to separate their inherent dignity from external outcomes, or speak to the part of them that learned love/worth had to be earned.
- The Micro-Rep: Suggest or co-create one small, concrete "behavioral rep" of self-worth—an action that proves they matter right now (e.g., holding a boundary, resting without apologizing, speaking neutrally to themselves).`;

const QUICK_STARTERS = [
  {
    label: "I feel like a failure after a mistake",
    prompt: "I made a mistake recently and now I'm spiraling into feeling like I'm completely incompetent and a failure as a person.",
    tag: "Shame vs. Guilt"
  },
  {
    label: "Someone is upset with me & I'm spiraling",
    prompt: "Someone is unhappy or disappointed with me right now, and my chest feels tight. I feel like a bad person unless everyone approves of me.",
    tag: "Fawning / Approval"
  },
  {
    label: "I feel guilty for resting / not producing",
    prompt: "I'm trying to rest or take a break today, but a loud voice in my head is telling me I'm lazy and falling behind. I feel like I haven't earned the right to relax.",
    tag: "Productivity Worth"
  },
  {
    label: "Audit a hidden rule about my worth",
    prompt: "I want to do a proactive deep-dive to uncover and dismantle a hidden rule I carry about what makes me worthy of respect and belonging.",
    tag: "Core Belief Audit"
  }
];

const DECONSTRUCTOR_EXAMPLES = [
  "I bombed the presentation today. Everyone probably realizes I don't belong in this role and I'm a total fraud.",
  "My friend hasn't texted me back in two days. I must have said something annoying and ruined things.",
  "I spent the whole weekend exhausted on the couch instead of catching up on chores. I'm so undisciplined and useless.",
  "I said 'no' to helping my coworker with their project, and now I feel selfish and guilty."
];

const LEDGER_CATEGORIES = [
  {
    id: "rested",
    label: "Rested Without Apology",
    color: "bg-emerald-100/80 text-emerald-900 border-emerald-300",
    dot: "bg-emerald-600",
    description: "Honored body or mind fatigue without demanding productivity first."
  },
  {
    id: "boundary",
    label: "Held a Boundary",
    color: "bg-amber-100/80 text-amber-900 border-amber-300",
    dot: "bg-amber-600",
    description: "Tolerated someone else's disappointment to protect my own capacity."
  },
  {
    id: "mistake",
    label: "Survived a Mistake with Kindness",
    color: "bg-rose-100/80 text-rose-900 border-rose-300",
    dot: "bg-rose-600",
    description: "Owned a behavioral error without attacking my core identity."
  },
  {
    id: "unhooked",
    label: "Disconnected Worth from Output",
    color: "bg-stone-200/90 text-stone-800 border-stone-400",
    dot: "bg-stone-600",
    description: "Separated my inherent human value from grades, praise, or metrics."
  }
];

const validCategory = (category) => (LEDGER_CATEGORIES.some(c => c.id === category) ? category : 'unhooked');

const DEFAULT_LEDGER_ITEMS = [
  {
    id: "seed-1",
    category: "mistake",
    title: "Separated a rough meeting from my identity",
    reflection: "Instead of calling myself an idiot all evening after stumbling over my words, I reminded myself: 'I had an awkward 10 minutes. My right to respect hasn't changed.'",
    source: "Deconstructor",
    completed: true,
    createdAt: Date.now() - DAY_MS * 2
  },
  {
    id: "seed-2",
    category: "rested",
    title: "Closed my laptop at 6 PM despite unfinished tasks",
    reflection: "My protector part wanted me to keep grinding so I could feel 'safe' from criticism, but I chose to rest as an act of inherent self-respect.",
    source: "Daily Micro-Rep",
    completed: true,
    createdAt: Date.now() - DAY_MS
  }
];

// When to check in on a committed micro-rep
const CHECKIN_OPTIONS = [
  { id: 'hour', label: 'In 1 hour', getDue: () => Date.now() + 3600000 },
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
const RSES_ITEMS = [
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
const RSES_OPTIONS = ["Strongly agree", "Agree", "Disagree", "Strongly disagree"];

// Option index 0 = Strongly agree. Positive items score 3..0, reversed items 0..3; total 0–30.
const scoreRses = (answers) =>
  answers.reduce((sum, a, i) => sum + (RSES_ITEMS[i].reversed ? a : 3 - a), 0);

const describeRses = (score) => {
  if (score < 15) return "lower range";
  if (score <= 25) return "typical range";
  return "higher range";
};

const formatDate = (ts) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const formatDue = (ts) => {
  const d = new Date(ts);
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `today at ${time}` : `${formatDate(ts)} at ${time}`;
};

// Welcome and error messages are UI-only: they aren't sent to the model or saveable
const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'model',
  kind: 'welcome',
  text: "Welcome. Take a slow breath and let your shoulders drop an inch.\n\nHere, we don't do empty hype or toxic positivity. We look honestly at the places where you've been taught that your worth is conditional—tied to how much you produce, how perfectly you perform, or whether everyone is happy with you.\n\nWhat triggered your self-worth wound today, or which hidden rule would you like to examine together?",
  timestamp: Date.now()
};

// Gemini expects alternating user/model turns, so skip UI-only messages and merge adjacent same-role turns
function buildApiContents(messages) {
  const contents = [];
  for (const m of messages) {
    if (m.kind) continue;
    const role = m.role === 'model' ? 'model' : 'user';
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${m.text}`;
    } else {
      contents.push({ role, parts: [{ text: m.text }] });
    }
  }
  return contents;
}

// ==========================================
// SMALL SHARED COMPONENTS
// ==========================================
function CrisisCard({ onContinue }) {
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 flex gap-3.5">
      <LifeBuoy className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
      <div className="text-sm text-stone-800 leading-relaxed">
        <p className="font-semibold text-rose-900 mb-1">It sounds like you might be carrying something really heavy.</p>
        <p>
          If you're thinking about harming yourself or don't feel safe, please reach out now: call or text <strong>988</strong> (US Suicide &amp; Crisis Lifeline), or contact your local emergency number. Talking to someone you trust counts too. You don't have to sort this out alone or earn the right to ask for help.
        </p>
        {onContinue && (
          <button
            onClick={onContinue}
            className="mt-3 text-xs text-stone-500 hover:text-stone-800 underline underline-offset-2"
          >
            I'm safe, continue with the analysis
          </button>
        )}
      </div>
    </div>
  );
}

function Modal({ title, icon: Icon, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FAF8F5] border border-stone-200 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2.5 text-emerald-900">
            <div className="p-2 rounded-xl bg-emerald-100">
              <Icon className="w-5 h-5 text-emerald-800" />
            </div>
            <h3 className="text-xl font-serif font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg border border-stone-200"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CheckInModal({ rep, ruleLabel, onClose, onDone, onSnooze, onRelease }) {
  const [step, setStep] = useState('ask'); // 'ask' | 'done' | 'later' | 'release'
  const [predicted, setPredicted] = useState('');
  const [actual, setActual] = useState('');
  const [note, setNote] = useState('');

  return (
    <Modal title="Micro-Rep Check-in" icon={BellRing} onClose={onClose}>
      <div className="p-4 rounded-2xl bg-[#F2EFE9] border border-stone-200/80 mb-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block mb-1">
          You committed to
        </span>
        <p className="text-sm font-medium text-stone-900 leading-relaxed">{rep.text}</p>
        {ruleLabel && (
          <p className="text-xs text-stone-500 mt-1.5">Testing the rule: <em>{ruleLabel}</em></p>
        )}
      </div>

      {step === 'ask' && (
        <div className="space-y-2.5">
          <p className="text-sm text-stone-700 mb-3">Did you get to do it?</p>
          <button
            onClick={() => setStep('done')}
            className="w-full py-3 rounded-xl bg-[#2C443B] hover:bg-[#21352D] text-white font-medium text-sm transition-colors"
          >
            Yes, I did it
          </button>
          <button
            onClick={() => setStep('later')}
            className="w-full py-3 rounded-xl bg-[#F2EFE9] hover:bg-[#EAE5DC] border border-stone-300 text-stone-800 font-medium text-sm transition-colors"
          >
            Not yet, check in later
          </button>
          <button
            onClick={() => setStep('release')}
            className="w-full py-2.5 text-xs text-stone-500 hover:text-stone-800 transition-colors"
          >
            I'm letting this one go
          </button>
        </div>
      )}

      {step === 'done' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onDone({ predicted: predicted.trim(), actual: actual.trim() });
          }}
          className="space-y-4"
        >
          <p className="text-sm text-stone-700">
            Compare the critic's forecast with what really happened. This contrast is the evidence that slowly loosens a hidden rule.
          </p>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              What did your inner critic predict would happen?
            </label>
            <textarea
              rows={2}
              value={predicted}
              onChange={(e) => setPredicted(e.target.value)}
              placeholder="e.g., 'Everyone will think I'm lazy and I'll fall hopelessly behind.'"
              className="w-full rounded-xl bg-[#F2EFE9] border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-800 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              What actually happened?
            </label>
            <textarea
              rows={2}
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              placeholder="e.g., 'Nobody noticed. I felt guilty for 10 minutes, then calmer.'"
              className="w-full rounded-xl bg-[#F2EFE9] border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-800 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#2C443B] hover:bg-[#21352D] text-white font-medium text-sm transition-colors"
          >
            Save to Worth Ledger
          </button>
        </form>
      )}

      {step === 'later' && (
        <div className="space-y-2">
          <p className="text-sm text-stone-700 mb-3">No problem. When should I check back?</p>
          {CHECKIN_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => onSnooze(opt)}
              className="w-full py-2.5 rounded-xl bg-[#F2EFE9] hover:bg-[#EAE5DC] border border-stone-300 text-stone-800 font-medium text-sm transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {step === 'release' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRelease(note.trim());
          }}
          className="space-y-4"
        >
          <p className="text-sm text-stone-700">
            Letting a rep go isn't a verdict on you. It's useful information about what's hard right now.
          </p>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
              What got in the way? (optional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl bg-[#F2EFE9] border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-800 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#F2EFE9] hover:bg-[#EAE5DC] border border-stone-300 text-stone-800 font-medium text-sm transition-colors"
          >
            Let it go
          </button>
        </form>
      )}
    </Modal>
  );
}

// Single-series line of self-esteem scores over time (0–30), with hover tooltips
function ScoreChart({ points }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const W = 640, H = 220, L = 36, R = 28, T = 18, B = 30;
  const t0 = points[0].createdAt;
  const t1 = points[points.length - 1].createdAt;
  const x = (t) => (t1 === t0 ? L + (W - L - R) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - R));
  const y = (s) => T + (1 - s / 30) * (H - T - B);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.createdAt)},${y(p.score)}`).join(' ');
  const last = points[points.length - 1];
  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Self-esteem scores over time, latest ${last.score} out of 30`}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <rect x={L} y={y(25)} width={W - L - R} height={y(15) - y(25)} fill="#2C443B" opacity="0.06" />
        <text x={W - R} y={y(25) - 5} textAnchor="end" fontSize="11" fill="#A8A29E">typical range</text>
        {[0, 10, 20, 30].map(v => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#E7E3DA" strokeWidth="1" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#A8A29E">{v}</text>
          </g>
        ))}
        <text x={L} y={H - 8} fontSize="11" fill="#A8A29E">{formatDate(t0)}</text>
        {t1 !== t0 && (
          <text x={W - R} y={H - 8} textAnchor="end" fontSize="11" fill="#A8A29E">{formatDate(t1)}</text>
        )}
        {hovered && (
          <line
            x1={x(hovered.createdAt)} x2={x(hovered.createdAt)} y1={T} y2={H - B}
            stroke="#D6D3D1" strokeWidth="1" strokeDasharray="3 3"
          />
        )}
        {points.length > 1 && (
          <path d={path} fill="none" stroke="#2C443B" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        )}
        {points.map((p, i) => (
          <circle
            key={p.id}
            cx={x(p.createdAt)}
            cy={y(p.score)}
            r={hoverIdx === i ? 6 : 4.5}
            fill="#2C443B"
            stroke="#FAF8F5"
            strokeWidth="2"
          />
        ))}
        <text
          x={x(last.createdAt)}
          y={y(last.score) - 12}
          textAnchor={points.length > 1 ? 'end' : 'middle'}
          fontSize="12"
          fontWeight="600"
          fill="#292524"
        >
          {last.score}
        </text>
        {points.map((p, i) => (
          <circle
            key={`hit-${p.id}`}
            cx={x(p.createdAt)}
            cy={y(p.score)}
            r="16"
            fill="transparent"
            tabIndex={0}
            onMouseEnter={() => setHoverIdx(i)}
            onFocus={() => setHoverIdx(i)}
            onBlur={() => setHoverIdx(null)}
          />
        ))}
      </svg>
      {hovered && (
        <div
          className="absolute pointer-events-none bg-[#292826] text-[#FAF8F5] text-xs rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap"
          style={{
            left: `${(x(hovered.createdAt) / W) * 100}%`,
            top: `${(y(hovered.score) / H) * 100}%`,
            transform: 'translate(-50%, calc(-100% - 12px))'
          }}
        >
          <span className="font-semibold">{hovered.score}/30</span> · {formatDate(hovered.createdAt)}
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('coach'); // 'coach' | 'deconstructor' | 'patterns' | 'ledger' | 'progress'
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const [somaticModalOpen, setSomaticModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  // --- Privacy State ---
  const [cloudEnabled, setCloudEnabled] = useState(() => {
    try {
      return localStorage.getItem('wa-cloud-off') !== '1';
    } catch {
      return true;
    }
  });
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // --- Synced collections ---
  const ledger = useUserCollection(user, 'worth_ledger', cloudEnabled);
  const rules = useUserCollection(user, 'hidden_rules', cloudEnabled);
  const ruleHits = useUserCollection(user, 'rule_hits', cloudEnabled);
  const reps = useUserCollection(user, 'micro_reps', cloudEnabled);
  const assessments = useUserCollection(user, 'assessments', cloudEnabled);

  // --- Chat Coach State ---
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // --- Deconstructor State ---
  const [rawThought, setRawThought] = useState('');
  const [emotionIntensity, setEmotionIntensity] = useState(7);
  const [isDeconstructing, setIsDeconstructing] = useState(false);
  const [deconstructionResult, setDeconstructionResult] = useState(null);
  const [deconstructCrisis, setDeconstructCrisis] = useState(false);
  const [showCommitOptions, setShowCommitOptions] = useState(false);

  // --- Patterns State ---
  const [expandedRuleId, setExpandedRuleId] = useState(null);
  const [confirmDeleteRuleId, setConfirmDeleteRuleId] = useState(null);

  // --- Ledger State ---
  // Seed examples live only in this session; user entries come from Firestore (or local fallback)
  const [seedItems, setSeedItems] = useState(DEFAULT_LEDGER_ITEMS);
  const [newRepTitle, setNewRepTitle] = useState('');
  const [newRepReflection, setNewRepReflection] = useState('');
  const [newRepCategory, setNewRepCategory] = useState('unhooked');
  const [newRepRuleId, setNewRepRuleId] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [checkInRepId, setCheckInRepId] = useState(null);

  // --- Progress State ---
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [rsesAnswers, setRsesAnswers] = useState(Array(RSES_ITEMS.length).fill(null));
  const [baselineBannerDismissed, setBaselineBannerDismissed] = useState(false);

  // ==========================================
  // DERIVED DATA
  // ==========================================
  const ledgerItems = [...ledger.items, ...seedItems].sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );
  const rulesById = Object.fromEntries(rules.items.map(r => [r.id, r]));

  const recentHitsFor = (ruleId) =>
    ruleHits.items.filter(h => h.ruleId === ruleId && h.createdAt >= now - PATTERN_WINDOW_MS);
  const allHitsFor = (ruleId) => ruleHits.items.filter(h => h.ruleId === ruleId);
  const evidenceFor = (ruleId) => ledger.items.filter(item => item.ruleId === ruleId);

  const rankedRules = [...rules.items].sort((a, b) => {
    const diff = recentHitsFor(b.id).length - recentHitsFor(a.id).length;
    return diff !== 0 ? diff : (b.lastSeenAt || 0) - (a.lastSeenAt || 0);
  });

  const pendingReps = reps.items
    .filter(r => r.status === 'pending')
    .sort((a, b) => a.dueAt - b.dueAt);
  const dueReps = pendingReps.filter(r => r.dueAt <= now);
  const checkInRep = reps.items.find(r => r.id === checkInRepId);

  const sortedAssessments = [...assessments.items].sort((a, b) => a.createdAt - b.createdAt);
  const latestAssessment = sortedAssessments[sortedAssessments.length - 1];
  const retakeDue = !latestAssessment || now - latestAssessment.createdAt >= RETAKE_INTERVAL_MS;

  // ==========================================
  // EFFECTS
  // ==========================================
  const showNotification = (msg) => {
    clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // Tick once a minute so due check-ins surface without a reload
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('wa-cloud-off', cloudEnabled ? '0' : '1');
    } catch {
      // Storage unavailable; the setting lasts for this session only
    }
  }, [cloudEnabled]);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.warn("Auth initialization error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  // ==========================================
  // MODULE 1: AI COACH HANDLERS
  // ==========================================
  const buildCoachSystemPrompt = () => {
    const topRules = rankedRules.slice(0, 5);
    if (topRules.length === 0) return COACH_SYSTEM_PROMPT;
    const lines = topRules
      .map(r => `- "${r.statement}" (came up ${recentHitsFor(r.id).length} times in the last 30 days)`)
      .join('\n');
    return `${COACH_SYSTEM_PROMPT}

CONTEXT FROM THIS USER'S PATTERN TRACKER (hidden rules they've identified in past sessions; draw on them only when relevant and never list them back mechanically):
${lines}`;
  };

  const handleSendMessage = async (overrideText = null) => {
    const textToSend = (overrideText !== null ? overrideText : chatInput).trim();
    if (!textToSend || isChatLoading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    const updatedMessages = [...messages, userMsg];
    const crisisMsg = CRISIS_PATTERN.test(textToSend)
      ? [{ id: `crisis-${Date.now()}`, role: 'model', kind: 'crisis', text: '', timestamp: Date.now() }]
      : [];
    setMessages([...updatedMessages, ...crisisMsg]);
    if (overrideText === null) setChatInput('');
    setIsChatLoading(true);

    try {
      const payload = {
        contents: buildApiContents(updatedMessages),
        systemInstruction: {
          parts: [{ text: buildCoachSystemPrompt() }]
        }
      };

      const replyText = await callGeminiAPI(payload);

      setMessages(prev => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          text: replyText,
          timestamp: Date.now()
        }
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          kind: 'error',
          text: "I hit a brief connection pause, but let's stay grounded right here. Notice what your inner critic is saying right now—can we separate the discomfort of this moment from your worth as a human being?",
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'model',
        kind: 'welcome',
        text: "Fresh canvas. Let's pause and check in with your nervous system. What thought, mistake, or interaction is pulling at your sense of worth right now?",
        timestamp: Date.now()
      }
    ]);
  };

  // ==========================================
  // MODULE 2: DECONSTRUCTOR HANDLER
  // ==========================================
  const handleDeconstruct = async (e, { skipCrisisCheck = false } = {}) => {
    if (e) e.preventDefault();
    const thought = rawThought.trim();
    if (!thought || isDeconstructing) return;

    if (!skipCrisisCheck && CRISIS_PATTERN.test(thought)) {
      setDeconstructCrisis(true);
      setDeconstructionResult(null);
      return;
    }

    setDeconstructCrisis(false);
    setIsDeconstructing(true);
    setDeconstructionResult(null);
    setShowCommitOptions(false);

    const knownRules = [...rules.items]
      .sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0))
      .slice(0, 20);
    const rulesContext = knownRules.length
      ? `\n\nThis user's previously identified hidden rules (id | rule):\n${knownRules.map(r => `${r.id} | ${r.statement}`).join('\n')}\n\nIf the hidden rule in this thought is essentially the same underlying rule as one of these (even if worded differently), return that id as matchedRuleId. Otherwise return an empty string for matchedRuleId.`
      : `\n\nReturn an empty string for matchedRuleId.`;

    const prompt = `Analyze the following painful thought or self-worth trigger from a user (Distress level: ${emotionIntensity}/10):
"${thought}"

Deconstruct this thought thoroughly using CBT, ACT (cognitive defusion), IFS (Internal Family Systems), and Brené Brown's Shame-vs-Guilt distinction. Avoid any cheesy toxic positivity. Ground everything in reality and unconditional human dignity.${rulesContext}`;

    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: {
        parts: [{ text: `You are a compassionate reflective guide informed by CBT, IFS, and ACT. You are not a therapist and do not diagnose. Deconstruct the user's shame statement into clear, deeply insightful, non-cheesy components.\n\n${CRISIS_RULE} In that case, use every field to gently urge them to contact 988 or a trusted person now instead of analyzing the thought.` }]
      },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            shameVsGuilt: {
              type: "STRING",
              description: "Translate the statement from Shame ('I am bad/defective') into objective reality or Guilt ('I did or experienced X, which is separate from who I am')."
            },
            fusionTrap: {
              type: "STRING",
              description: "Explain how the user is fusing their core identity with an external metric, mistake, or another person's reaction."
            },
            hiddenRule: {
              type: "STRING",
              description: "State the exact silent conditional rule operating underneath (e.g., 'I am only worthy of peace if I never inconvenience anyone')."
            },
            ruleLabel: {
              type: "STRING",
              description: "A short 3–7 word name for the hidden rule that makes it easy to recognize later, e.g. 'My worth = my output' or 'Others' disappointment means I'm bad'."
            },
            matchedRuleId: {
              type: "STRING",
              description: "The id of a previously identified rule that this is the same as, or an empty string."
            },
            protectorMotive: {
              type: "STRING",
              description: "Using Internal Family Systems (IFS), explain with empathy what this harsh Inner Critic is trying to protect the user from (e.g., attacking them first so rejection from others won't blindside them)."
            },
            groundedReframe: {
              type: "STRING",
              description: "A calm, dignified, realistic statement the user can actually believe right now without toxic positivity."
            },
            microRep: {
              type: "STRING",
              description: "One concrete, small physical or behavioral Micro-Rep of self-respect the user can do today, phrased as an action they can later say they did or didn't do."
            },
            suggestedCategory: {
              type: "STRING",
              description: "One of: 'rested', 'boundary', 'mistake', or 'unhooked'"
            }
          },
          propertyOrdering: [
            "shameVsGuilt",
            "fusionTrap",
            "hiddenRule",
            "ruleLabel",
            "matchedRuleId",
            "protectorMotive",
            "groundedReframe",
            "microRep",
            "suggestedCategory"
          ]
        }
      }
    };

    try {
      const jsonStr = await callGeminiAPI(payload);
      const parsed = JSON.parse(jsonStr);

      // Record this occurrence against an existing rule, or start tracking a new one
      const ts = Date.now();
      const matched = rules.items.find(r => r.id === parsed.matchedRuleId);
      let ruleId;
      if (matched) {
        ruleId = matched.id;
        rules.update(matched.id, { lastSeenAt: ts });
      } else {
        ruleId = await rules.add({
          label: parsed.ruleLabel || 'Unnamed rule',
          statement: parsed.hiddenRule || '',
          createdAt: ts,
          lastSeenAt: ts
        });
      }
      await ruleHits.add({ ruleId, thought, intensity: emotionIntensity, createdAt: ts });

      setDeconstructionResult({
        originalThought: thought,
        ...parsed,
        ruleId,
        ruleLabel: matched ? matched.label : parsed.ruleLabel,
        isRecurring: Boolean(matched)
      });
    } catch (error) {
      // Generic fallback; not recorded as a pattern because it isn't based on the user's thought
      setDeconstructionResult({
        originalThought: thought,
        isFallback: true,
        ruleId: null,
        shameVsGuilt: "Your brain is translating an uncomfortable event or imperfection into a verdict on your entire identity.",
        fusionTrap: "You are fusing an external moment or performance outcome with your right to exist with dignity.",
        hiddenRule: "\"I am only allowed to feel safe and worthy when I perform without flaws or friction.\"",
        protectorMotive: "This harsh voice is trying to beat you to the punch—criticizing you first in hopes of motivating you or shielding you from unexpected rejection.",
        groundedReframe: "I am experiencing a difficult moment or an imperfect outcome, AND my fundamental worth as a human being is not up for negotiation.",
        microRep: "Place one hand on your chest, unclench your jaw, and speak to yourself in the tone you would use with a tired friend for the next 5 minutes.",
        suggestedCategory: "unhooked"
      });
    } finally {
      setIsDeconstructing(false);
    }
  };

  const commitToRep = async (option) => {
    const r = deconstructionResult;
    await reps.add({
      text: r.microRep,
      ruleId: r.ruleId || null,
      category: validCategory(r.suggestedCategory),
      status: 'pending',
      dueAt: option.getDue(),
      createdAt: Date.now()
    });
    setDeconstructionResult(prev => ({ ...prev, committed: true }));
    setShowCommitOptions(false);
    showNotification(`Committed. Check-in: ${option.label.toLowerCase()}.`);
  };

  // ==========================================
  // MODULE 3: WORTH LEDGER HANDLERS
  // ==========================================
  const addLedgerEntry = async ({ title, reflection, category, source = "Manual Entry", ruleId = null }) => {
    await ledger.add({
      title: title.trim(),
      reflection: reflection.trim(),
      category: validCategory(category),
      source,
      ruleId: ruleId || null,
      completed: true,
      createdAt: Date.now()
    });
    showNotification("Saved to your Inherent Worth Ledger");
  };

  const handleManualLedgerSubmit = (e) => {
    e.preventDefault();
    if (!newRepTitle.trim()) return;
    addLedgerEntry({
      title: newRepTitle,
      reflection: newRepReflection || "Practiced unconditional self-respect in action.",
      category: newRepCategory,
      source: "Daily Micro-Rep",
      ruleId: newRepRuleId || null
    });
    setNewRepTitle('');
    setNewRepReflection('');
    setNewRepRuleId('');
  };

  const handleDeleteLedgerItem = (id) => {
    if (id.startsWith('seed-')) {
      setSeedItems(prev => prev.filter(item => item.id !== id));
      return;
    }
    ledger.remove(id);
  };

  // ==========================================
  // MICRO-REP CHECK-IN HANDLERS
  // ==========================================
  const completeRep = async (rep, { predicted, actual }) => {
    await reps.update(rep.id, { status: 'done', completedAt: Date.now(), predicted, actual });
    const reflection = [
      predicted && `My critic predicted: "${predicted}"`,
      actual && `What actually happened: "${actual}"`
    ].filter(Boolean).join(' ') || "Followed through on a micro-rep of self-respect.";
    setCheckInRepId(null);
    addLedgerEntry({
      title: rep.text,
      reflection,
      category: rep.category,
      source: 'Micro-Rep Check-in',
      ruleId: rep.ruleId
    });
  };

  const snoozeRep = (rep, option) => {
    reps.update(rep.id, { dueAt: option.getDue() });
    setCheckInRepId(null);
    showNotification(`Snoozed. Check-in: ${option.label.toLowerCase()}.`);
  };

  const releaseRep = (rep, note) => {
    reps.update(rep.id, { status: 'released', releasedAt: Date.now(), releaseNote: note });
    setCheckInRepId(null);
    showNotification("Let go. That's information, not failure.");
  };

  // ==========================================
  // PATTERNS HANDLERS
  // ==========================================
  const handleDeleteRule = async (ruleId) => {
    setConfirmDeleteRuleId(null);
    await rules.remove(ruleId);
    await Promise.all(allHitsFor(ruleId).map(h => ruleHits.remove(h.id)));
  };

  const exploreRuleWithCoach = (rule) => {
    setActiveTab('coach');
    handleSendMessage(
      `I keep running into this hidden rule: "${rule.statement}". It's come up ${recentHitsFor(rule.id).length} times in the last 30 days. Can you help me understand where it comes from and how to loosen its grip?`
    );
  };

  const logEvidenceAgainst = (rule) => {
    setNewRepRuleId(rule.id);
    setActiveTab('ledger');
  };

  // ==========================================
  // PROGRESS HANDLERS
  // ==========================================
  const submitAssessment = async (e) => {
    e.preventDefault();
    if (rsesAnswers.some(a => a === null)) return;
    const score = scoreRses(rsesAnswers);
    await assessments.add({ answers: rsesAnswers, score, createdAt: Date.now() });
    setAssessmentOpen(false);
    setRsesAnswers(Array(RSES_ITEMS.length).fill(null));
    showNotification(`Check-in saved: ${score}/30`);
  };

  // ==========================================
  // PRIVACY HANDLERS
  // ==========================================
  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      ledger: ledger.items,
      hiddenRules: rules.items,
      ruleOccurrences: ruleHits.items,
      microReps: reps.items,
      selfEsteemCheckIns: assessments.items
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worthiness-architect-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      await Promise.all([ledger, rules, ruleHits, reps, assessments].map(c => c.removeAll()));
      setSeedItems([]);
      setMessages([WELCOME_MESSAGE]);
      setDeconstructionResult(null);
      setConfirmDeleteAll(false);
      setPrivacyModalOpen(false);
      showNotification("All your data has been deleted");
    } catch (err) {
      console.warn("Delete-all error:", err);
      showNotification("Some data couldn't be deleted. Please try again.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const filteredLedgerItems = selectedCategoryFilter === 'all'
    ? ledgerItems
    : ledgerItems.filter(item => item.category === selectedCategoryFilter);

  const userLedgerCount = ledger.items.length;
  const deconstructions30d = ruleHits.items.filter(h => h.createdAt >= now - PATTERN_WINDOW_MS).length;
  const repsDone = reps.items.filter(r => r.status === 'done').length;

  const TABS = [
    { id: 'coach', label: 'Coach', icon: MessageSquareHeart },
    { id: 'deconstructor', label: 'Deconstructor', icon: Layers },
    { id: 'patterns', label: 'Patterns', icon: Repeat, count: rules.items.length },
    { id: 'ledger', label: 'Worth Ledger', icon: BookOpen, count: ledgerItems.length },
    { id: 'progress', label: 'Progress', icon: TrendingUp }
  ];

  const inputClass = "w-full rounded-xl bg-[#F2EFE9] border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-800 focus:bg-white";

  return (
    <div className="min-h-screen bg-[#F6F4EE] text-[#292826] font-sans selection:bg-emerald-800 selection:text-white flex flex-col">
      {/* animate-fadeIn is not a built-in Tailwind utility */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .animate-fadeIn { animation: fadeIn 0.35s ease-out both; }
      `}</style>

      {/* Notification Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#233831] text-[#F6F4EE] px-5 py-3.5 rounded-2xl shadow-xl border border-emerald-700/40 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* Somatic Grounding Modal */}
      {somaticModalOpen && (
        <Modal title="60-Second Somatic Unhooking" icon={Wind} onClose={() => setSomaticModalOpen(false)}>
          <p className="text-stone-600 text-sm leading-relaxed mb-6">
            When the self-worth wound is triggered, your body can react to social disapproval or a mistake as if it were a threat. Before reasoning with your thoughts, signal safety to your body:
          </p>

          <div className="space-y-4 mb-6">
            <div className="p-4 rounded-2xl bg-[#F2EFE9] border border-stone-200/80 flex gap-3.5">
              <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">1</span>
              <div>
                <h4 className="font-semibold text-stone-800 text-sm">Drop the Armor</h4>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">Unclench your jaw, let your tongue rest on the floor of your mouth, and drop your shoulders away from your ears.</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F2EFE9] border border-stone-200/80 flex gap-3.5">
              <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">2</span>
              <div>
                <h4 className="font-semibold text-stone-800 text-sm">Name the Protector</h4>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">Say quietly: <em>"A part of me is terrified that I'm not enough right now. I notice this part, and I don't have to obey it."</em></p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#F2EFE9] border border-stone-200/80 flex gap-3.5">
              <span className="w-6 h-6 rounded-full bg-emerald-800 text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">3</span>
              <div>
                <h4 className="font-semibold text-stone-800 text-sm">Anchor Inherent Dignity</h4>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">Inhale for 4 seconds, exhale slowly for 6 seconds. Remind yourself: <em>"My actions can be adjusted; my worth is foundational."</em></p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSomaticModalOpen(false)}
            className="w-full py-3 rounded-xl bg-[#2C443B] hover:bg-[#21352D] text-white font-medium text-sm transition-colors shadow-sm"
          >
            I'm Ready to Continue
          </button>
        </Modal>
      )}

      {/* Privacy & Data Modal */}
      {privacyModalOpen && (
        <Modal
          title="Your Data"
          icon={Lock}
          onClose={() => {
            setPrivacyModalOpen(false);
            setConfirmDeleteAll(false);
          }}
        >
          <div className="space-y-4 text-sm text-stone-700 leading-relaxed">
            <div className="p-4 rounded-2xl bg-[#F2EFE9] border border-stone-200/80 space-y-2">
              <h4 className="font-semibold text-stone-900 text-sm">What's saved</h4>
              <p className="text-xs">
                Your ledger ({userLedgerCount}), hidden rules ({rules.items.length}) and the thoughts that triggered them ({ruleHits.items.length}), micro-rep commitments ({reps.items.length}), and self-esteem check-ins ({assessments.items.length}). Coach conversations are not saved; they clear when you start a new thread or reload.
              </p>
              <p className="text-xs">
                {db
                  ? "Saved entries are stored in this app's Firebase database under an anonymous account tied to this browser. There's no password, so clearing your browser data may make them unreachable."
                  : "Cloud storage isn't available here, so everything lives in this browser tab and disappears when you reload."}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F2EFE9] border border-stone-200/80 space-y-2">
              <h4 className="font-semibold text-stone-900 text-sm">What's sent to AI</h4>
              <p className="text-xs">
                Text you send to the Coach or Deconstructor is sent to Google's Gemini API to generate a response. The Coach also receives short summaries of your recurring hidden rules so it can remember your patterns. Google's handling of that text is governed by Google's terms. This app doesn't use your entries for anything except showing them back to you.
              </p>
            </div>

            <label className="flex items-start gap-3 p-4 rounded-2xl border border-stone-200 cursor-pointer hover:bg-[#F2EFE9]/60">
              <input
                type="checkbox"
                checked={!cloudEnabled}
                onChange={(e) => setCloudEnabled(!e.target.checked)}
                className="mt-1 accent-[#2C443B]"
              />
              <span className="text-xs">
                <span className="font-semibold text-stone-900 block text-sm">Don't save new entries</span>
                New entries stay in this tab only and disappear when you reload. Entries already saved aren't affected.
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={handleExport}
                className="flex-1 py-2.5 rounded-xl bg-[#F2EFE9] hover:bg-[#EAE5DC] border border-stone-300 text-stone-800 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export my data
              </button>
              {!confirmDeleteAll ? (
                <button
                  onClick={() => setConfirmDeleteAll(true)}
                  className="flex-1 py-2.5 rounded-xl border border-rose-300 text-rose-800 hover:bg-rose-50 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete everything
                </button>
              ) : (
                <button
                  onClick={handleDeleteAll}
                  disabled={isDeletingAll}
                  className="flex-1 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isDeletingAll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Yes, permanently delete all
                </button>
              )}
            </div>
            {confirmDeleteAll && (
              <p className="text-xs text-rose-800">
                This permanently removes every entry, pattern, check-in, and commitment. It can't be undone. Export first if you want a copy.
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* Micro-Rep Check-in Modal */}
      {checkInRep && (
        <CheckInModal
          key={checkInRep.id}
          rep={checkInRep}
          ruleLabel={rulesById[checkInRep.ruleId]?.label}
          onClose={() => setCheckInRepId(null)}
          onDone={(outcome) => completeRep(checkInRep, outcome)}
          onSnooze={(option) => snoozeRep(checkInRep, option)}
          onRelease={(note) => releaseRep(checkInRep, note)}
        />
      )}

      {/* Self-Esteem Check-in Modal */}
      {assessmentOpen && (
        <Modal title="Self-Esteem Check-in" icon={TrendingUp} onClose={() => setAssessmentOpen(false)}>
          <p className="text-xs text-stone-600 leading-relaxed mb-5">
            10 statements from the Rosenberg Self-Esteem Scale, a widely used research measure. Answer for how you generally feel right now. There are no right answers; this is a baseline, not a grade.
          </p>
          <form onSubmit={submitAssessment} className="space-y-4">
            {RSES_ITEMS.map((item, i) => (
              <fieldset key={i} className="p-3.5 rounded-2xl bg-[#F2EFE9] border border-stone-200/80">
                <legend className="sr-only">{item.text}</legend>
                <p className="text-sm font-medium text-stone-900 mb-2.5">
                  <span className="text-stone-400 mr-1.5">{i + 1}.</span>{item.text}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {RSES_OPTIONS.map((opt, optIdx) => (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => setRsesAnswers(prev => prev.map((a, j) => (j === i ? optIdx : a)))}
                      className={`px-2 py-2 rounded-xl text-xs font-medium border transition-colors ${
                        rsesAnswers[i] === optIdx
                          ? 'bg-[#2C443B] text-white border-[#2C443B]'
                          : 'bg-[#FAF8F5] text-stone-700 border-stone-200 hover:bg-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <button
              type="submit"
              disabled={rsesAnswers.some(a => a === null)}
              className="w-full py-3 rounded-xl bg-[#2C443B] hover:bg-[#21352D] disabled:opacity-40 text-white font-medium text-sm transition-colors"
            >
              {rsesAnswers.some(a => a === null)
                ? `Answer all 10 (${rsesAnswers.filter(a => a !== null).length}/10)`
                : 'Save check-in'}
            </button>
          </form>
        </Modal>
      )}

      {/* ========================================== */}
      {/* TOP NAVIGATION HEADER                      */}
      {/* ========================================== */}
      <header className="sticky top-0 z-30 bg-[#F6F4EE]/90 backdrop-blur-md border-b border-stone-200/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#2C443B] text-[#F6F4EE] flex items-center justify-center shadow-sm shrink-0">
                <Anchor className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-serif font-semibold tracking-tight text-stone-900">
                  The Worthiness Architect
                </h1>
                <p className="text-xs text-stone-500 hidden sm:block">
                  Unconditional Worth • CBT, ACT & Internal Family Systems
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={() => setPrivacyModalOpen(true)}
                className="inline-flex items-center gap-2 p-2 sm:px-3 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 text-xs font-medium whitespace-nowrap transition-colors"
                aria-label="Your data"
              >
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Your Data</span>
              </button>
              <button
                onClick={() => setSomaticModalOpen(true)}
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-950/5 hover:bg-emerald-950/10 text-emerald-950 text-xs font-medium border border-emerald-900/15 whitespace-nowrap transition-colors"
              >
                <Wind className="w-4 h-4 text-emerald-800" />
                <span className="sm:hidden">Pause</span>
                <span className="hidden sm:inline">Somatic Grounding</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-[#EAE6DD] p-1.5 rounded-2xl border border-stone-300/60 overflow-x-auto self-start max-w-full">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#FAF8F5] text-[#2C443B] shadow-sm font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-emerald-900/10 text-emerald-950 font-semibold">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ========================================== */}
      {/* STATUS BANNERS                             */}
      {/* ========================================== */}
      {(dueReps.length > 0 || (assessments.loaded && retakeDue && !baselineBannerDismissed)) && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4 space-y-2">
          {dueReps.length > 0 && (
            <div className="flex items-center justify-between gap-3 bg-[#2C443B] text-[#FAF8F5] rounded-2xl px-4 py-3 animate-fadeIn">
              <div className="flex items-center gap-2.5 text-sm">
                <BellRing className="w-4 h-4 text-emerald-200 shrink-0" />
                <span>
                  {dueReps.length === 1
                    ? 'A micro-rep check-in is ready.'
                    : `${dueReps.length} micro-rep check-ins are ready.`}
                </span>
              </div>
              <button
                onClick={() => setCheckInRepId(dueReps[0].id)}
                className="shrink-0 px-3.5 py-1.5 rounded-xl bg-[#FAF8F5] text-[#2C443B] text-xs font-semibold hover:bg-white transition-colors"
              >
                Check in
              </button>
            </div>
          )}
          {assessments.loaded && retakeDue && !baselineBannerDismissed && (
            <div className="flex items-center justify-between gap-3 bg-[#FAF8F5] border border-stone-200/90 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2.5 text-sm text-stone-700">
                <TrendingUp className="w-4 h-4 text-emerald-800 shrink-0" />
                <span>
                  {latestAssessment
                    ? "It's been two weeks. A 2-minute check-in shows whether things are shifting."
                    : 'Set a 2-minute baseline so you can see change over time.'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setAssessmentOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#2C443B] text-white text-xs font-semibold hover:bg-[#21352D] transition-colors"
                >
                  Start
                </button>
                <button
                  onClick={() => setBaselineBannerDismissed(true)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* MAIN WORKSPACE CONTENT                     */}
      {/* ========================================== */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">

        {/* ------------------------------------------ */}
        {/* TAB 1: THE UNCONDITIONAL WORTH COACH       */}
        {/* ------------------------------------------ */}
        {activeTab === 'coach' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Sidebar: Protocol & Quick Triggers */}
            <div className="lg:col-span-4 space-y-5">
              {/* Coaching Philosophy Card */}
              <div className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-5 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-900 font-serif font-semibold text-base mb-2">
                  <Compass className="w-4 h-4 text-emerald-700" />
                  <span>The 4-Step Worth Protocol</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed mb-4">
                  True self-worth isn't built with empty flattery. We dismantle conditional worth through four grounded steps:
                </p>
                <div className="space-y-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#F2EFE9] border border-stone-200/60">
                    <span className="font-semibold text-stone-800">1. Name the Trigger & Protector:</span>
                    <span className="text-stone-600 block mt-0.5">Hear the Inner Critic without obeying its verdict.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F2EFE9] border border-stone-200/60">
                    <span className="font-semibold text-stone-800">2. Audit the Hidden Rule:</span>
                    <span className="text-stone-600 block mt-0.5">Expose the silent contract demanding perfection or approval.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F2EFE9] border border-stone-200/60">
                    <span className="font-semibold text-stone-800">3. Separate Self from Behavior:</span>
                    <span className="text-stone-600 block mt-0.5">Unhook your human dignity from external outcomes.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F2EFE9] border border-stone-200/60">
                    <span className="font-semibold text-stone-800">4. Practice a Micro-Rep:</span>
                    <span className="text-stone-600 block mt-0.5">Take one small behavioral action of self-respect right now.</span>
                  </div>
                </div>
              </div>

              {/* Quick-Start Conversation Triggers */}
              <div className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-5 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
                  Quick-Start Triggers
                </h3>
                <div className="space-y-2">
                  {QUICK_STARTERS.map((starter, idx) => (
                    <button
                      key={idx}
                      disabled={isChatLoading}
                      onClick={() => handleSendMessage(starter.prompt)}
                      className="w-full text-left p-3 rounded-2xl bg-[#F2EFE9]/70 hover:bg-[#EAE5DC] border border-stone-200/80 transition-all group disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-900/10 text-emerald-900">
                          {starter.tag}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-xs font-medium text-stone-800 leading-snug">
                        "{starter.label}"
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Main Column: Chat Interface */}
            <div className="lg:col-span-8 bg-[#FAF8F5] border border-stone-200/90 rounded-3xl shadow-sm flex flex-col h-[680px]">
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-stone-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span className="text-sm font-medium text-stone-800">
                    Unconditional Worth Session
                  </span>
                  <span className="text-xs text-stone-400 hidden sm:inline">
                    • Zero Toxic Positivity
                  </span>
                </div>
                <button
                  onClick={handleResetChat}
                  disabled={isChatLoading}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 px-2.5 py-1 rounded-lg hover:bg-stone-200/50 transition-colors disabled:opacity-40"
                  title="Reset session"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>New Thread</span>
                </button>
              </div>

              {/* Chat Messages Scroll Container */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                {messages.map((msg) => {
                  if (msg.kind === 'crisis') {
                    return <CrisisCard key={msg.id} />;
                  }
                  const isModel = msg.role === 'model';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                          {isModel ? 'Worthiness Architect' : 'You'}
                        </span>
                      </div>

                      <div
                        className={`max-w-[90%] sm:max-w-[82%] rounded-2xl px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap ${
                          isModel
                            ? 'bg-[#F2EFE9] text-stone-800 border border-stone-200/90 rounded-tl-sm'
                            : 'bg-[#2C443B] text-[#FAF8F5] rounded-tr-sm shadow-sm'
                        }`}
                      >
                        {msg.text}
                      </div>

                      {/* Option to save insight from AI response to Ledger */}
                      {isModel && !msg.kind && (
                        <div className="mt-2 flex items-center gap-3 px-1">
                          <button
                            onClick={() =>
                              addLedgerEntry({
                                title: "Coaching Insight & Reframe",
                                reflection: msg.text.slice(0, 280) + (msg.text.length > 280 ? "..." : ""),
                                category: "unhooked",
                                source: "Worth Coach"
                              })
                            }
                            className="inline-flex items-center gap-1 text-xs text-emerald-800 hover:text-emerald-950 font-medium transition-colors"
                          >
                            <BookmarkCheck className="w-3.5 h-3.5" />
                            <span>Save Insight to Worth Ledger</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {isChatLoading && (
                  <div className="flex items-start gap-3">
                    <div className="bg-[#F2EFE9] border border-stone-200/90 rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-stone-600 flex items-center gap-2.5">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-800" />
                      <span>Listening beneath the inner critic...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-4 border-t border-stone-200/80 bg-[#FAF8F5] rounded-b-3xl"
              >
                <div className="flex items-end gap-2.5">
                  <textarea
                    rows={2}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Share what happened, what your inner critic is saying, or where you feel 'not enough'..."
                    className="flex-1 resize-none rounded-2xl bg-[#F2EFE9] border border-stone-300/80 px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-emerald-800 focus:bg-white transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatLoading}
                    className="h-[52px] px-5 rounded-2xl bg-[#2C443B] hover:bg-[#1f322b] disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm"
                  >
                    <span>Reflect</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------------------ */}
        {/* TAB 2: SHAME-TO-GUILT DECONSTRUCTOR        */}
        {/* ------------------------------------------ */}
        {activeTab === 'deconstructor' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Top Input Card */}
            <div className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="max-w-2xl mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold mb-3">
                  <Scale className="w-3.5 h-3.5" />
                  Cognitive & IFS Pattern Interruptor
                </span>
                <h2 className="text-2xl font-serif font-semibold text-stone-900">
                  Shame-to-Guilt & Conditional Worth Deconstructor
                </h2>
                <p className="text-sm text-stone-600 mt-1.5 leading-relaxed">
                  Shame says <em>"I am bad."</em> Guilt or objective reality says <em>"I made a choice or experienced an outcome that didn't go well, and my core worth remains intact."</em> Enter a painful thought below to untangle it. Each hidden rule you uncover is tracked in Patterns.
                </p>
              </div>

              {/* Sample Chips */}
              <div className="mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 block mb-2">
                  Or try an example trigger:
                </span>
                <div className="flex flex-wrap gap-2">
                  {DECONSTRUCTOR_EXAMPLES.map((example, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRawThought(example)}
                      className="text-xs bg-[#F2EFE9] hover:bg-[#E6E1D6] text-stone-700 px-3 py-1.5 rounded-xl border border-stone-300/70 transition-colors text-left"
                    >
                      "{example.slice(0, 58)}..."
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleDeconstruct} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
                    What is your Inner Critic saying right now?
                  </label>
                  <textarea
                    rows={3}
                    value={rawThought}
                    onChange={(e) => setRawThought(e.target.value)}
                    placeholder="e.g., 'I stumbled through my presentation today, I'm completely incompetent and everyone knows it...'"
                    className="w-full rounded-2xl bg-[#F2EFE9] border border-stone-300/90 p-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-emerald-800 focus:bg-white transition-colors"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-4">
                    <label className="text-xs font-medium text-stone-600">
                      Shame / Tightness Intensity: <strong className="text-stone-900">{emotionIntensity}/10</strong>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={emotionIntensity}
                      onChange={(e) => setEmotionIntensity(Number(e.target.value))}
                      className="w-32 accent-[#2C443B] cursor-pointer"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!rawThought.trim() || isDeconstructing}
                    className="px-6 py-3.5 rounded-2xl bg-[#2C443B] hover:bg-[#1f322b] disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    {isDeconstructing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Deconstructing Pattern...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Deconstruct & Unhook Worth</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {deconstructCrisis && (
              <CrisisCard onContinue={() => handleDeconstruct(null, { skipCrisisCheck: true })} />
            )}

            {/* Deconstruction Output Cards */}
            {deconstructionResult && (
              <div className="space-y-5 animate-fadeIn">
                {deconstructionResult.isFallback && (
                  <div className="text-xs text-stone-600 bg-[#EAE6DD] border border-stone-300 rounded-2xl px-4 py-3">
                    The AI couldn't be reached, so this is a general analysis rather than one specific to your thought. It hasn't been added to your Patterns.
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card A: The Fusion Trap */}
                  <div className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-rose-900 font-semibold text-sm mb-2">
                      <ShieldAlert className="w-4 h-4 text-rose-700" />
                      <span>1. The Identity Fusion Trap</span>
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed">
                      {deconstructionResult.fusionTrap}
                    </p>
                    <div className="mt-3 pt-3 border-t border-stone-200/70">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block">
                        Shame-to-Guilt Translation
                      </span>
                      <p className="text-xs text-stone-600 mt-1">
                        {deconstructionResult.shameVsGuilt}
                      </p>
                    </div>
                  </div>

                  {/* Card B: The Hidden Conditional Rule */}
                  <div className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm mb-2">
                      <Eye className="w-4 h-4 text-amber-700" />
                      <span>2. The Hidden Conditional Rule</span>
                    </div>
                    <p className="text-sm font-serif italic text-stone-800 bg-amber-50/90 border border-amber-200/80 rounded-2xl p-3.5 mb-3">
                      {deconstructionResult.hiddenRule}
                    </p>
                    {deconstructionResult.ruleId ? (
                      <button
                        onClick={() => {
                          setExpandedRuleId(deconstructionResult.ruleId);
                          setActiveTab('patterns');
                        }}
                        className="w-full text-left text-xs rounded-xl bg-[#F2EFE9] hover:bg-[#EAE5DC] border border-stone-200 px-3 py-2.5 transition-colors"
                      >
                        <span className="flex items-center gap-1.5 font-semibold text-stone-800">
                          <Repeat className="w-3.5 h-3.5 text-amber-700" />
                          {deconstructionResult.ruleLabel}
                        </span>
                        <span className="text-stone-600 block mt-0.5">
                          {deconstructionResult.isRecurring
                            ? `This rule has come up ${recentHitsFor(deconstructionResult.ruleId).length} times in the last 30 days. See the pattern →`
                            : 'New pattern. Now tracked in Patterns →'}
                        </span>
                      </button>
                    ) : (
                      <p className="text-xs text-stone-600 leading-relaxed">
                        Notice how this rule treats human worth like a temporary subscription you have to renew every day through flawlessness.
                      </p>
                    )}
                  </div>

                  {/* Card C: The Protector's Motive (IFS) */}
                  <div className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-stone-800 font-semibold text-sm mb-2">
                      <HeartHandshake className="w-4 h-4 text-emerald-800" />
                      <span>3. The Protector's Motive (IFS)</span>
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed">
                      {deconstructionResult.protectorMotive}
                    </p>
                    <p className="text-xs text-stone-500 mt-3 italic">
                      You don't need to hate your Inner Critic—thank it for trying to keep you safe, then let it step back.
                    </p>
                  </div>

                  {/* Card D: The Grounded Reframe */}
                  <div className="bg-[#2C443B] text-[#FAF8F5] rounded-3xl p-6 shadow-md flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-200 font-semibold text-sm mb-2">
                        <Anchor className="w-4 h-4" />
                        <span>4. Your Grounded, Dignified Truth</span>
                      </div>
                      <p className="text-base font-serif leading-relaxed text-white mt-2">
                        "{deconstructionResult.groundedReframe}"
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-emerald-800/60 flex items-center justify-between">
                      <span className="text-xs text-emerald-200/80"> Realistic • Non-performative</span>
                    </div>
                  </div>
                </div>

                {/* Card E: Micro-Rep Action Banner */}
                <div className="bg-[#EAE6DD] border border-stone-300 rounded-3xl p-6 space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      5. Suggested Micro-Rep of Self-Worth
                    </span>
                    <p className="text-sm font-medium text-stone-900 leading-relaxed">
                      {deconstructionResult.microRep}
                    </p>
                    <p className="text-xs text-stone-600">
                      Commit to it and I'll check in afterward to compare what your critic predicted with what actually happened.
                    </p>
                  </div>

                  {deconstructionResult.committed ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-900 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Committed. You'll see a check-in when it's due.
                    </div>
                  ) : deconstructionResult.logged ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-900 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Logged in your Worth Ledger.
                    </div>
                  ) : showCommitOptions ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-stone-700 mr-1">Check in:</span>
                      {CHECKIN_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => commitToRep(opt)}
                          className="px-3.5 py-2 rounded-xl bg-[#2C443B] hover:bg-[#1f322b] text-white text-xs font-medium transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowCommitOptions(false)}
                        className="px-2 py-2 text-xs text-stone-500 hover:text-stone-800"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => setShowCommitOptions(true)}
                        className="px-4 py-2.5 rounded-xl bg-[#2C443B] hover:bg-[#1f322b] text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Target className="w-4 h-4" />
                        <span>Commit to this rep</span>
                      </button>

                      <button
                        onClick={() => {
                          addLedgerEntry({
                            title: deconstructionResult.microRep,
                            reflection: `Reframed: "${deconstructionResult.groundedReframe}"`,
                            category: deconstructionResult.suggestedCategory,
                            source: 'Shame Deconstructor',
                            ruleId: deconstructionResult.ruleId
                          });
                          setDeconstructionResult(prev => ({ ...prev, logged: true }));
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-white text-stone-800 border border-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <BookmarkCheck className="w-4 h-4" />
                        <span>I already did it</span>
                      </button>

                      <button
                        disabled={isChatLoading}
                        onClick={() => {
                          setActiveTab('coach');
                          handleSendMessage(
                            `I just deconstructed this thought: "${deconstructionResult.originalThought}". The hidden rule underneath was: ${deconstructionResult.hiddenRule}. Can you help me work with the protector part that still feels anxious about this?`
                          );
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#FAF8F5] hover:bg-white text-stone-800 border border-stone-300 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <span>Explore with Coach</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------ */}
        {/* TAB 3: HIDDEN RULE PATTERNS                */}
        {/* ------------------------------------------ */}
        {activeTab === 'patterns' && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold mb-3">
                <Repeat className="w-3.5 h-3.5" />
                Recurring Hidden Rules
              </span>
              <h2 className="text-2xl font-serif font-semibold text-stone-900">Your Patterns</h2>
              <p className="text-sm text-stone-600 mt-1.5 leading-relaxed">
                Every thought you deconstruct is matched to the hidden rule underneath it. Over time you'll see which rules run your life most often, and you can collect evidence that contradicts them.
              </p>
            </div>

            {rankedRules.length === 0 ? (
              <div className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-10 text-center">
                <Repeat className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                <h3 className="text-base font-serif font-semibold text-stone-800">No patterns yet</h3>
                <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 mb-4">
                  Deconstruct a painful thought and the hidden rule underneath it will appear here.
                </p>
                <button
                  onClick={() => setActiveTab('deconstructor')}
                  className="px-4 py-2.5 rounded-xl bg-[#2C443B] hover:bg-[#1f322b] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <Layers className="w-4 h-4" />
                  Open the Deconstructor
                </button>
              </div>
            ) : (
              rankedRules.map(rule => {
                const recent = recentHitsFor(rule.id);
                const total = allHitsFor(rule.id);
                const evidence = evidenceFor(rule.id);
                const avgIntensity = recent.length
                  ? (recent.reduce((s, h) => s + (h.intensity || 0), 0) / recent.length).toFixed(1)
                  : null;
                const expanded = expandedRuleId === rule.id;
                const ruleReps = reps.items.filter(r => r.ruleId === rule.id);
                return (
                  <div key={rule.id} className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-5 sm:p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-serif font-semibold text-stone-900">{rule.label}</h3>
                        <p className="text-sm font-serif italic text-stone-600 mt-1">"{rule.statement}"</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-semibold text-stone-900 leading-none">{recent.length}</div>
                        <div className="text-[11px] text-stone-500 mt-1">times in 30 days</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500 mt-3">
                      <span>{total.length} total</span>
                      {avgIntensity && <span>Avg. intensity {avgIntensity}/10</span>}
                      <span>Last seen {formatDate(rule.lastSeenAt || rule.createdAt)}</span>
                      <span className="text-emerald-800 font-medium">
                        {evidence.length} piece{evidence.length === 1 ? '' : 's'} of counter-evidence
                      </span>
                      {ruleReps.length > 0 && (
                        <span>
                          {ruleReps.filter(r => r.status === 'done').length}/{ruleReps.length} reps completed
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <button
                        onClick={() => logEvidenceAgainst(rule)}
                        className="px-3.5 py-2 rounded-xl bg-[#2C443B] hover:bg-[#1f322b] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Log evidence against it
                      </button>
                      <button
                        disabled={isChatLoading}
                        onClick={() => exploreRuleWithCoach(rule)}
                        className="px-3.5 py-2 rounded-xl bg-[#F2EFE9] hover:bg-[#EAE5DC] border border-stone-300 text-stone-800 text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        Explore with Coach
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setExpandedRuleId(expanded ? null : rule.id)}
                        className="px-3 py-2 text-xs text-stone-600 hover:text-stone-900"
                      >
                        {expanded ? 'Hide details' : 'Show details'}
                      </button>
                      <div className="ml-auto">
                        {confirmDeleteRuleId === rule.id ? (
                          <span className="flex items-center gap-2 text-xs">
                            <button onClick={() => handleDeleteRule(rule.id)} className="text-rose-700 font-medium">Delete pattern</button>
                            <button onClick={() => setConfirmDeleteRuleId(null)} className="text-stone-500">Cancel</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteRuleId(rule.id)}
                            className="text-stone-300 hover:text-rose-700 transition-colors p-1"
                            title="Delete pattern"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {expanded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-5 border-t border-stone-200/80 animate-fadeIn">
                        <div>
                          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-2">
                            When it showed up
                          </h4>
                          <div className="space-y-2">
                            {[...total].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6).map(hit => (
                              <div key={hit.id} className="text-xs bg-[#F2EFE9] border border-stone-200/80 rounded-xl px-3 py-2">
                                <div className="text-stone-400 mb-0.5">
                                  {formatDate(hit.createdAt)} · intensity {hit.intensity}/10
                                </div>
                                <div className="text-stone-700">"{hit.thought}"</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-2">
                            Evidence against it
                          </h4>
                          {evidence.length === 0 ? (
                            <p className="text-xs text-stone-500 leading-relaxed">
                              Nothing yet. Each time you act against this rule and the sky doesn't fall, log it. That record is what slowly weakens the rule.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {[...evidence].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6).map(item => (
                                <div key={item.id} className="text-xs bg-emerald-50/70 border border-emerald-200/70 rounded-xl px-3 py-2">
                                  <div className="text-stone-400 mb-0.5">{formatDate(item.createdAt)}</div>
                                  <div className="font-medium text-stone-800">{item.title}</div>
                                  <div className="text-stone-600 mt-0.5">{item.reflection}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ------------------------------------------ */}
        {/* TAB 4: INHERENT WORTH LEDGER               */}
        {/* ------------------------------------------ */}
        {activeTab === 'ledger' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Form: Log a Micro-Rep */}
            <div className="lg:col-span-5 bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-950 font-serif font-semibold text-lg mb-1">
                <Feather className="w-5 h-5 text-emerald-800" />
                <h2>Log a Micro-Rep of Worth</h2>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed mb-5">
                Brains tend to hold onto failures and let moments of worth slide past. Unlike a resume of achievements, this ledger records moments you treated yourself with inherent dignity.
              </p>

              <form onSubmit={handleManualLedgerSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-2">
                    Category of Unconditional Worth
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {LEDGER_CATEGORIES.map((cat) => (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setNewRepCategory(cat.id)}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                          newRepCategory === cat.id
                            ? 'bg-[#2C443B] text-white border-[#2C443B] shadow-sm'
                            : 'bg-[#F2EFE9]/70 text-stone-800 border-stone-200 hover:bg-[#EAE5DC]'
                        }`}
                      >
                        <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${newRepCategory === cat.id ? 'bg-emerald-300' : cat.dot}`} />
                        <div>
                          <div className="text-xs font-semibold">{cat.label}</div>
                          <div className={`text-[11px] mt-0.5 ${newRepCategory === cat.id ? 'text-stone-200' : 'text-stone-500'}`}>
                            {cat.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                    What Micro-Rep did you practice?
                  </label>
                  <input
                    type="text"
                    value={newRepTitle}
                    onChange={(e) => setNewRepTitle(e.target.value)}
                    placeholder="e.g., Took a 30-minute break without apologizing"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                    Grounded Reflection (Why this matters)
                  </label>
                  <textarea
                    rows={3}
                    value={newRepReflection}
                    onChange={(e) => setNewRepReflection(e.target.value)}
                    placeholder="e.g., Even though my inbox wasn't empty, I proved to my nervous system that I don't have to earn the right to breathe."
                    className={inputClass}
                  />
                </div>

                {rules.items.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                      Which hidden rule does this contradict? (optional)
                    </label>
                    <select
                      value={newRepRuleId}
                      onChange={(e) => setNewRepRuleId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">None / not sure</option>
                      {rankedRules.map(rule => (
                        <option key={rule.id} value={rule.id}>{rule.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!newRepTitle.trim()}
                  className="w-full py-3 rounded-xl bg-[#2C443B] hover:bg-[#1f322b] disabled:opacity-40 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to My Worth Ledger</span>
                </button>
              </form>
            </div>

            {/* Right Column: Commitments + Saved Evidence Ledger */}
            <div className="lg:col-span-7 space-y-4">
              {pendingReps.length > 0 && (
                <div className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-5 shadow-sm">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Committed Micro-Reps
                  </h3>
                  <div className="space-y-2">
                    {pendingReps.map(rep => {
                      const isDue = rep.dueAt <= now;
                      return (
                        <div key={rep.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#F2EFE9]/70 border border-stone-200/80">
                          <div className="min-w-0">
                            <p className="text-sm text-stone-800 leading-snug">{rep.text}</p>
                            <p className={`text-[11px] mt-0.5 ${isDue ? 'text-emerald-800 font-semibold' : 'text-stone-500'}`}>
                              {isDue ? 'Check-in ready' : `Check-in ${formatDue(rep.dueAt)}`}
                              {rulesById[rep.ruleId] && ` · ${rulesById[rep.ruleId].label}`}
                            </p>
                          </div>
                          <button
                            onClick={() => setCheckInRepId(rep.id)}
                            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                              isDue
                                ? 'bg-[#2C443B] text-white hover:bg-[#1f322b]'
                                : 'bg-[#FAF8F5] border border-stone-300 text-stone-700 hover:bg-white'
                            }`}
                          >
                            Check in
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category Filter Pills */}
              <div className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-4 shadow-sm flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    selectedCategoryFilter === 'all'
                      ? 'bg-[#2C443B] text-white'
                      : 'bg-[#F2EFE9] text-stone-600 hover:text-stone-900'
                  }`}
                >
                  All Entries ({ledgerItems.length})
                </button>
                {LEDGER_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      selectedCategoryFilter === cat.id
                        ? 'bg-[#2C443B] text-white'
                        : 'bg-[#F2EFE9] text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Ledger Items List */}
              <div className="space-y-3">
                {filteredLedgerItems.length === 0 ? (
                  <div className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-10 text-center">
                    <BookOpen className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <h3 className="text-base font-serif font-semibold text-stone-800">
                      No entries in this category yet
                    </h3>
                    <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                      Every time you rest without apologizing, hold a gentle boundary, or refuse to attack yourself after a mistake, record it here as evidence of your worth.
                    </p>
                  </div>
                ) : (
                  filteredLedgerItems.map((item) => {
                    const catObj = LEDGER_CATEGORIES.find(c => c.id === item.category) || LEDGER_CATEGORIES[3];
                    const linkedRule = rulesById[item.ruleId];
                    return (
                      <div
                        key={item.id}
                        className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-5 shadow-sm hover:border-stone-300 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${catObj.color}`}>
                              {catObj.label}
                            </span>
                            {item.source && (
                              <span className="text-[11px] text-stone-400">
                                • via {item.source}
                              </span>
                            )}
                            {item.id.startsWith('seed-') && (
                              <span className="text-[11px] text-stone-400 italic">
                                • example
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteLedgerItem(item.id)}
                            className="text-stone-300 hover:text-rose-700 transition-colors p-1"
                            title="Remove entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <h4 className="text-base font-serif font-semibold text-stone-900 mb-1">
                          {item.title}
                        </h4>
                        <p className="text-sm text-stone-600 leading-relaxed">
                          {item.reflection}
                        </p>
                        {linkedRule && (
                          <p className="text-[11px] text-stone-500 mt-2 flex items-center gap-1">
                            <Repeat className="w-3 h-3 text-amber-700" />
                            Counter-evidence to <em>{linkedRule.label}</em>
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------ */}
        {/* TAB 5: PROGRESS                            */}
        {/* ------------------------------------------ */}
        {activeTab === 'progress' && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Thoughts deconstructed', sub: 'last 30 days', value: deconstructions30d },
                { label: 'Hidden rules tracked', sub: 'all time', value: rules.items.length },
                { label: 'Micro-reps completed', sub: 'all time', value: repsDone },
                { label: 'Ledger entries', sub: 'all time', value: userLedgerCount }
              ].map(stat => (
                <div key={stat.label} className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-4 shadow-sm">
                  <div className="text-2xl font-semibold text-stone-900">{stat.value}</div>
                  <div className="text-xs font-medium text-stone-700 mt-1">{stat.label}</div>
                  <div className="text-[11px] text-stone-400">{stat.sub}</div>
                </div>
              ))}
            </div>

            <div className="bg-[#FAF8F5] border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-serif font-semibold text-stone-900">Self-Esteem Over Time</h2>
                  <p className="text-xs text-stone-600 mt-1 max-w-xl leading-relaxed">
                    Rosenberg Self-Esteem Scale, 0–30. Retake every two weeks to see whether the work is shifting how you see yourself. This is a reflection tool, not a diagnosis.
                  </p>
                </div>
                <button
                  onClick={() => setAssessmentOpen(true)}
                  className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    retakeDue
                      ? 'bg-[#2C443B] hover:bg-[#1f322b] text-white'
                      : 'bg-[#F2EFE9] hover:bg-[#EAE5DC] border border-stone-300 text-stone-800'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  {latestAssessment ? 'Take a check-in' : 'Set your baseline'}
                </button>
              </div>

              {sortedAssessments.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-stone-300 rounded-2xl">
                  <TrendingUp className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-sm text-stone-600">No check-ins yet.</p>
                  <p className="text-xs text-stone-500 mt-1">Your baseline takes about 2 minutes.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
                    <span className="text-3xl font-semibold text-stone-900">{latestAssessment.score}<span className="text-base text-stone-400">/30</span></span>
                    <span className="text-sm text-stone-600">latest, {describeRses(latestAssessment.score)}</span>
                    {sortedAssessments.length > 1 && (() => {
                      const delta = latestAssessment.score - sortedAssessments[0].score;
                      return (
                        <span className="text-sm text-stone-600">
                          · {delta > 0 ? '+' : ''}{delta} since baseline
                        </span>
                      );
                    })()}
                  </div>
                  <ScoreChart points={sortedAssessments} />
                  {!retakeDue && (
                    <p className="text-xs text-stone-500 mt-2">
                      Next check-in suggested {formatDate(latestAssessment.createdAt + RETAKE_INTERVAL_MS)}.
                    </p>
                  )}

                  <table className="w-full text-xs mt-5">
                    <thead>
                      <tr className="text-left text-stone-400 border-b border-stone-200">
                        <th className="font-semibold py-2">Date</th>
                        <th className="font-semibold py-2">Score</th>
                        <th className="font-semibold py-2">Range</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {[...sortedAssessments].reverse().map(a => (
                        <tr key={a.id} className="border-b border-stone-200/60 text-stone-700">
                          <td className="py-2">{formatDate(a.createdAt)}</td>
                          <td className="py-2 font-medium">{a.score}/30</td>
                          <td className="py-2">{describeRses(a.score)}</td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => assessments.remove(a.id)}
                              className="text-stone-300 hover:text-rose-700 p-1"
                              title="Remove check-in"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Persistent safety footer */}
      <footer className="border-t border-stone-200/90 bg-[#F6F4EE]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-start sm:items-center gap-2 text-xs text-stone-500">
          <LifeBuoy className="w-4 h-4 text-rose-700 shrink-0" />
          <p>
            This is a self-reflection tool, not therapy or emergency care. If you're thinking about harming yourself or are in danger, call or text <strong className="text-stone-800">988</strong> (US Suicide &amp; Crisis Lifeline) or your local emergency number.
          </p>
        </div>
      </footer>
    </div>
  );
}
