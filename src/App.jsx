import React, { useState, useEffect, useRef } from 'react';
import { Zap, MessageCircle, Layers, BookMarked, TrendingUp, Wind, Lock, LifeBuoy } from 'lucide-react';
import { Wordmark, LogoMark, Toast } from './components/ui.jsx';
import { GroundingDialog, CheckInDialog, AssessmentDialog, PrivacyDialog } from './components/dialogs.jsx';
import Reset from './screens/Reset.jsx';
import Reflect from './screens/Reflect.jsx';
import Untangle from './screens/Untangle.jsx';
import Evidence from './screens/Evidence.jsx';
import Insights from './screens/Insights.jsx';
import { useStoredCollection, readStored, writeStored } from './lib/storage.js';
import { postJSON, buildChatMessages } from './lib/api.js';
import {
  CRISIS_PATTERN, PATTERN_WINDOW_MS, RETAKE_INTERVAL_MS, EXAMPLE_EVIDENCE, WELCOME_MESSAGE, RESET_MESSAGE,
  ERROR_MESSAGE_TEXT, validCategory, scoreRses
} from './lib/content.js';

const TABS = [
  { id: 'reset', label: 'Reset', icon: Zap },
  { id: 'reflect', label: 'Reflect', icon: MessageCircle },
  { id: 'untangle', label: 'Untangle', icon: Layers },
  { id: 'evidence', label: 'Evidence', icon: BookMarked },
  { id: 'insights', label: 'Insights', icon: TrendingUp }
];

// Generic reading shown when the AI can't be reached; deliberately not recorded as a pattern
const FALLBACK_RESULT = {
  isFallback: true,
  ruleId: null,
  shameVsGuilt: "Your mind is turning an uncomfortable event or imperfection into a verdict on your whole identity.",
  fusionTrap: "A single moment or outcome is being treated as a measure of your right to be treated with dignity.",
  hiddenRule: "\"I'm only allowed to feel safe and worthy when I perform without flaws or friction.\"",
  protectorMotive: "The harsh voice is trying to get there first, criticizing you before anyone else can, in the hope of motivating you or softening a rejection.",
  groundedReframe: "I'm in a difficult moment with an imperfect outcome, and my worth as a person is not up for negotiation.",
  microRep: "Put a hand on your chest, unclench your jaw, and speak to yourself for the next five minutes the way you would to a tired friend.",
  suggestedCategory: "unhooked"
};

export default function App() {
  const [tab, setTab] = useState('reset');
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const [dialog, setDialog] = useState(null); // 'pause' | 'privacy' | 'assessment' | { checkIn: id }
  const [now, setNow] = useState(Date.now());

  // --- Storage ---
  const [saveEnabled, setSaveEnabled] = useState(() => readStored('wa-save-enabled', true));
  const ledger = useStoredCollection('worth_ledger', saveEnabled);
  const exampleEntries = useStoredCollection('examples', true, EXAMPLE_EVIDENCE);
  const rules = useStoredCollection('hidden_rules', saveEnabled);
  const ruleHits = useStoredCollection('rule_hits', saveEnabled);
  const reps = useStoredCollection('micro_reps', saveEnabled);
  const assessments = useStoredCollection('assessments', saveEnabled);
  const resets = useStoredCollection('resets', saveEnabled);
  // Per-card helped/skipped counts; the deck builder favors cards that have helped before
  const [cardStats, setCardStats] = useState(() => readStored('wa-card-stats', {}));

  // --- Reflect ---
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- Untangle ---
  const [rawThought, setRawThought] = useState('');
  const [intensity, setIntensity] = useState(7);
  const [isUntangling, setIsUntangling] = useState(false);
  const [result, setResult] = useState(null);
  const [untangleCrisis, setUntangleCrisis] = useState(false);
  const [showCommitOptions, setShowCommitOptions] = useState(false);

  // --- Evidence ---
  const [newTitle, setNewTitle] = useState('');
  const [newReflection, setNewReflection] = useState('');
  const [newCategory, setNewCategory] = useState('unhooked');
  const [newRuleId, setNewRuleId] = useState('');
  const [filter, setFilter] = useState('all');

  // --- Insights ---
  const [expandedRuleId, setExpandedRuleId] = useState(null);

  // ==========================================
  // DERIVED DATA
  // ==========================================
  const ledgerItems = [...ledger.items, ...exampleEntries.items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const rulesById = Object.fromEntries(rules.items.map(r => [r.id, r]));
  const recentHitsFor = (ruleId) => ruleHits.items.filter(h => h.ruleId === ruleId && h.createdAt >= now - PATTERN_WINDOW_MS);
  const allHitsFor = (ruleId) => ruleHits.items.filter(h => h.ruleId === ruleId);
  const evidenceFor = (ruleId) => ledger.items.filter(item => item.ruleId === ruleId);
  const rankedRules = [...rules.items].sort((a, b) => {
    const diff = recentHitsFor(b.id).length - recentHitsFor(a.id).length;
    return diff !== 0 ? diff : (b.lastSeenAt || 0) - (a.lastSeenAt || 0);
  });
  const pendingReps = reps.items.filter(r => r.status === 'pending').sort((a, b) => a.dueAt - b.dueAt);
  const dueReps = pendingReps.filter(r => r.dueAt <= now);
  const sortedAssessments = [...assessments.items].sort((a, b) => a.createdAt - b.createdAt);
  const latestAssessment = sortedAssessments[sortedAssessments.length - 1];
  const retakeDue = !latestAssessment || now - latestAssessment.createdAt >= RETAKE_INTERVAL_MS;
  const checkInRep = dialog?.checkIn ? reps.items.find(r => r.id === dialog.checkIn) : null;

  // The user's own words come back as Reset cards: past truer sentences and logged evidence
  const personalCards = [
    ...ruleHits.items.filter(h => h.reframe).slice(0, 15).map(h => ({ id: `own-${h.id}`, title: 'Your truer sentence', body: h.reframe })),
    ...ledger.items.slice(0, 15).map(item => ({ id: `ev-${item.id}`, title: 'Remember this?', body: item.title, sub: item.reflection }))
  ];

  // ==========================================
  // EFFECTS
  // ==========================================
  const notify = (msg) => {
    clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  // Tick once a minute so due check-ins surface without a reload
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    writeStored('wa-save-enabled', saveEnabled);
  }, [saveEnabled]);

  useEffect(() => {
    writeStored('wa-card-stats', cardStats);
  }, [cardStats]);

  const go = (nextTab, { ruleId } = {}) => {
    setTab(nextTab);
    if (ruleId) setExpandedRuleId(ruleId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==========================================
  // REFLECT
  // ==========================================
  const sendMessage = async (overrideText = null) => {
    const text = (overrideText !== null ? overrideText : chatInput).trim();
    if (!text || isChatLoading) return;

    const userMsg = { id: `user-${Date.now()}`, role: 'user', text, timestamp: Date.now() };
    const updated = [...messages, userMsg];
    const crisisMsg = CRISIS_PATTERN.test(text)
      ? [{ id: `crisis-${Date.now()}`, role: 'model', kind: 'crisis', text: '' }]
      : [];
    setMessages([...updated, ...crisisMsg]);
    if (overrideText === null) setChatInput('');
    setIsChatLoading(true);

    try {
      const { text: reply } = await postJSON('/api/coach', {
        messages: buildChatMessages(updated),
        patterns: rankedRules.slice(0, 5).map(r => ({ statement: r.statement, count: recentHitsFor(r.id).length }))
      });
      setMessages(prev => [...prev, { id: `model-${Date.now()}`, role: 'model', text: reply, timestamp: Date.now() }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'model', kind: 'error', text: err.status === 429 ? err.message : ERROR_MESSAGE_TEXT }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const resetChat = () => setMessages([{ ...RESET_MESSAGE, timestamp: Date.now() }]);

  // ==========================================
  // UNTANGLE
  // ==========================================
  const untangle = async (e, { skipCrisisCheck = false } = {}) => {
    if (e) e.preventDefault();
    const thought = rawThought.trim();
    if (!thought || isUntangling) return;

    if (!skipCrisisCheck && CRISIS_PATTERN.test(thought)) {
      setUntangleCrisis(true);
      setResult(null);
      return;
    }

    setUntangleCrisis(false);
    setIsUntangling(true);
    setResult(null);
    setShowCommitOptions(false);

    const knownRules = [...rules.items]
      .sort((a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0))
      .slice(0, 20)
      .map(r => ({ id: r.id, statement: r.statement }));

    try {
      const parsed = await postJSON('/api/deconstruct', { thought, intensity, knownRules });

      // Record this occurrence against an existing rule, or start tracking a new one
      const ts = Date.now();
      const matched = rules.items.find(r => r.id === parsed.matchedRuleId);
      let ruleId;
      if (matched) {
        ruleId = matched.id;
        rules.update(matched.id, { lastSeenAt: ts });
      } else {
        ruleId = rules.add({ label: parsed.ruleLabel || 'Unnamed rule', statement: parsed.hiddenRule || '', createdAt: ts, lastSeenAt: ts });
      }
      ruleHits.add({ ruleId, thought, intensity, reframe: parsed.groundedReframe || '', createdAt: ts });

      setResult({
        originalThought: thought,
        ...parsed,
        ruleId,
        ruleLabel: matched ? matched.label : parsed.ruleLabel,
        isRecurring: Boolean(matched)
      });
    } catch {
      setResult({ originalThought: thought, ...FALLBACK_RESULT });
    } finally {
      setIsUntangling(false);
    }
  };

  const commitToRep = (option) => {
    reps.add({
      text: result.microRep,
      ruleId: result.ruleId || null,
      category: validCategory(result.suggestedCategory),
      status: 'pending',
      dueAt: option.getDue(),
      createdAt: Date.now()
    });
    setResult(prev => ({ ...prev, committed: true }));
    setShowCommitOptions(false);
    notify(`Committed. Check-in ${option.label.toLowerCase()}.`);
  };

  // ==========================================
  // EVIDENCE
  // ==========================================
  const addEvidence = ({ title, reflection, category, source = 'Logged', ruleId = null }) => {
    ledger.add({
      title: title.trim(),
      reflection: reflection.trim(),
      category: validCategory(category),
      source,
      ruleId: ruleId || null,
      completed: true,
      createdAt: Date.now()
    });
    notify('Added to your evidence');
  };

  const logResultNow = () => {
    addEvidence({
      title: result.microRep,
      reflection: `A truer sentence: "${result.groundedReframe}"`,
      category: result.suggestedCategory,
      source: 'Untangle',
      ruleId: result.ruleId
    });
    setResult(prev => ({ ...prev, logged: true }));
  };

  const submitEvidence = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addEvidence({
      title: newTitle,
      reflection: newReflection || 'Treated myself as worthy, without conditions.',
      category: newCategory,
      ruleId: newRuleId || null
    });
    setNewTitle('');
    setNewReflection('');
    setNewRuleId('');
  };

  const deleteEvidence = (id) => (id.startsWith('seed-') ? exampleEntries.remove(id) : ledger.remove(id));

  // ==========================================
  // CHECK-INS
  // ==========================================
  const completeRep = (rep, { predicted, actual }) => {
    reps.update(rep.id, { status: 'done', completedAt: Date.now(), predicted, actual });
    const reflection = [
      predicted && `My critic predicted: "${predicted}"`,
      actual && `What actually happened: "${actual}"`
    ].filter(Boolean).join(' ') || 'Followed through on a small rep of self-respect.';
    setDialog(null);
    addEvidence({ title: rep.text, reflection, category: rep.category, source: 'Check-in', ruleId: rep.ruleId });
  };

  const snoozeRep = (rep, option) => {
    reps.update(rep.id, { dueAt: option.getDue() });
    setDialog(null);
    notify(`Okay. Check-in ${option.label.toLowerCase()}.`);
  };

  const releaseRep = (rep, note) => {
    reps.update(rep.id, { status: 'released', releasedAt: Date.now(), releaseNote: note });
    setDialog(null);
    notify("Let go. That's information, not failure.");
  };

  // ==========================================
  // INSIGHTS
  // ==========================================
  const deleteRule = (ruleId) => {
    rules.remove(ruleId);
    allHitsFor(ruleId).forEach(h => ruleHits.remove(h.id));
  };

  const exploreRule = (rule) => {
    go('reflect');
    sendMessage(`I keep running into this hidden rule: "${rule.statement}". It's come up ${recentHitsFor(rule.id).length} times in the last 30 days. Can you help me understand where it comes from and how to loosen its grip?`);
  };

  const logEvidenceAgainst = (rule) => {
    setNewRuleId(rule.id);
    go('evidence');
  };

  const submitAssessment = (answers) => {
    const score = scoreRses(answers);
    assessments.add({ answers, score, createdAt: Date.now() });
    setDialog(null);
    notify(`Check-in saved · ${score}/30`);
  };

  // ==========================================
  // RESET
  // ==========================================
  const recordCard = (cardId, didHelp) => {
    setCardStats(prev => {
      const s = prev[cardId] || { helped: 0, skipped: 0 };
      return { ...prev, [cardId]: didHelp ? { ...s, helped: s.helped + 1 } : { ...s, skipped: s.skipped + 1 } };
    });
  };

  const saveReset = (session) => resets.add(session);

  // ==========================================
  // PRIVACY
  // ==========================================
  const exportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      evidence: ledger.items,
      hiddenRules: rules.items,
      ruleOccurrences: ruleHits.items,
      microReps: reps.items,
      selfEsteemCheckIns: assessments.items,
      resets: resets.items,
      cardStats
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worthiness-architect-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const deleteAll = () => {
    [ledger, exampleEntries, rules, ruleHits, reps, assessments, resets].forEach(c => c.removeAll());
    setCardStats({});
    setMessages([WELCOME_MESSAGE]);
    setResult(null);
    setDialog(null);
    notify('Everything has been deleted');
  };

  const app = {
    now, go, ledger, rules, ruleHits, reps, assessments, resets, cardStats, recordCard, saveReset, personalCards, ledgerItems, rulesById, recentHitsFor, allHitsFor, evidenceFor,
    rankedRules, pendingReps, dueReps, sortedAssessments, latestAssessment, retakeDue,
    openCheckIn: (id) => setDialog({ checkIn: id }),
    openAssessment: () => setDialog('assessment'),
    messages, chatInput, setChatInput, isChatLoading, sendMessage, resetChat, addEvidence,
    rawThought, setRawThought, intensity, setIntensity, isUntangling, result, untangleCrisis,
    showCommitOptions, setShowCommitOptions, untangle, commitToRep, logResultNow,
    newTitle, setNewTitle, newReflection, setNewReflection, newCategory, setNewCategory, newRuleId, setNewRuleId,
    submitEvidence, deleteEvidence, filter, setFilter,
    expandedRuleId, setExpandedRuleId, deleteRule, exploreRule, logEvidenceAgainst
  };

  const Screen = { reset: Reset, reflect: Reflect, untangle: Untangle, evidence: Evidence, insights: Insights }[tab];

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] bg-surface px-4 py-2 rounded-lg">Skip to content</a>

      <header className="sticky top-0 z-40 bg-bg border-b border-line">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between gap-4">
          <button onClick={() => go('reset')} className="shrink-0" aria-label="Worthiness Architect, go to Reset">
            <span className="hidden sm:block"><Wordmark /></span>
            <span className="sm:hidden"><Wordmark compact /></span>
          </button>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`relative h-10 px-4 rounded-full text-[14px] font-medium transition-colors ${
                  tab === t.id ? 'bg-ink text-bg' : 'text-ink-2 hover:text-ink hover:bg-sunken'
                }`}
              >
                {t.label}
                {t.id === 'evidence' && dueReps.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-keystone" aria-label={`${dueReps.length} check-ins due`} />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setDialog('privacy')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-ink-2 hover:text-ink hover:bg-sunken transition-colors"
              aria-label="Your data and privacy"
              title="Your data"
            >
              <Lock className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => setDialog('pause')}
              className="h-9 sm:h-10 pl-3 pr-3.5 sm:pl-3.5 sm:pr-4 rounded-full flex items-center gap-1.5 sm:gap-2 text-[13px] sm:text-[14px] font-medium text-brand-ink bg-brand-soft hover:brightness-95 transition-all"
            >
              <Wind className="w-4 h-4" />
              Pause
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-32 md:pb-20">
        <div key={tab} className="animate-rise">
          <Screen app={app} />
        </div>
      </main>

      <footer className="border-t border-line pb-24 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8 text-[13px] text-ink-3">
          <div className="flex items-center gap-2 shrink-0">
            <LogoMark className="w-5 h-5" />
            <span className="font-display italic text-ink-2">Worth is the foundation, not the reward.</span>
          </div>
          <p className="flex items-start gap-2 md:ml-auto md:text-right">
            <LifeBuoy className="w-4 h-4 text-danger shrink-0 mt-px" />
            <span>
              A reflection tool, not therapy or emergency care. If you're thinking about harming yourself, call or text <strong className="text-ink">988</strong> (US) or your local emergency number.
            </span>
          </p>
        </div>
      </footer>

      {/* Phone tab bar */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line pb-[env(safe-area-inset-bottom)]"
        aria-label="Main"
      >
        <div className="grid grid-cols-5">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition-colors ${active ? 'text-brand' : 'text-ink-3'}`}
              >
                <span className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${active ? 'bg-brand-soft' : ''}`}>
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                </span>
                {t.label}
                {t.id === 'evidence' && dueReps.length > 0 && (
                  <span className="absolute top-2 right-[calc(50%-18px)] w-2 h-2 rounded-full bg-keystone" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <Toast message={toast} />

      {dialog === 'pause' && <GroundingDialog onClose={() => setDialog(null)} />}
      {dialog === 'assessment' && <AssessmentDialog onClose={() => setDialog(null)} onSubmit={submitAssessment} />}
      {dialog === 'privacy' && (
        <PrivacyDialog
          counts={{ resets: resets.items.length, evidence: ledger.items.length, rules: rules.items.length, hits: ruleHits.items.length, reps: reps.items.length, assessments: assessments.items.length }}
          saveEnabled={saveEnabled}
          onToggleSave={setSaveEnabled}
          onExport={exportData}
          onDeleteAll={deleteAll}
          onClose={() => setDialog(null)}
        />
      )}
      {checkInRep && (
        <CheckInDialog
          key={checkInRep.id}
          rep={checkInRep}
          ruleLabel={rulesById[checkInRep.ruleId]?.label}
          onClose={() => setDialog(null)}
          onDone={(outcome) => completeRep(checkInRep, outcome)}
          onSnooze={(option) => snoozeRep(checkInRep, option)}
          onRelease={(note) => releaseRep(checkInRep, note)}
        />
      )}
    </div>
  );
}
