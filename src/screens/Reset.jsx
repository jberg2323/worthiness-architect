import React, { useState } from 'react';
import { ArrowRight, Layers, MessageCircle, BellRing, Zap, LifeBuoy, RotateCcw } from 'lucide-react';
import { Card, Button } from '../components/ui.jsx';
import SwipeDeck from '../components/SwipeDeck.jsx';
import { RESET_STATES, buildDeck } from '../lib/cards.js';

const SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function Scale({ value, onPick, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-10 gap-1 sm:gap-1.5">
      {SCALE.map(n => (
        <button
          key={n}
          role="radio"
          aria-checked={value === n}
          onClick={() => onPick(n)}
          className={`h-12 sm:h-14 rounded-xl text-[15px] sm:text-[17px] font-semibold tabular-nums border transition-all active:scale-95 ${
            value === n ? 'bg-brand text-on-brand border-brand' : 'bg-surface border-line text-ink hover:border-brand'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function shiftMessage(before, after) {
  if (before == null) return "Thanks for checking in with yourself.";
  const drop = before - after;
  if (drop >= 3) return "That's a real shift. Your body knows how to come back down.";
  if (drop >= 1) return "A little lighter. Small shifts count, and they add up.";
  return "Still heavy, and that's okay. Some moments need more than a minute.";
}

export default function Reset({ app }) {
  const [phase, setPhase] = useState('pick'); // 'pick' | 'deck' | 'after' | 'done'
  const [state, setState] = useState(null);
  const [before, setBefore] = useState(null);
  const [after, setAfter] = useState(null);
  const [deck, setDeck] = useState([]);
  const [position, setPosition] = useState(0);
  const [helped, setHelped] = useState([]);
  const [skipped, setSkipped] = useState([]);

  const start = (stateId, intensity) => {
    setState(stateId);
    setBefore(intensity);
    setAfter(null);
    setDeck(buildDeck({ state: stateId, stats: app.cardStats, personal: app.personalCards }));
    setPosition(0);
    setHelped([]);
    setSkipped([]);
    setPhase('deck');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSwipe = (dir, card) => {
    if (dir === 'right') setHelped(h => [...h, card]);
    else setSkipped(s => [...s, card]);
    app.recordCard(card.id, dir === 'right');
    if (position + 1 >= deck.length) setPhase('after');
    else setPosition(p => p + 1);
  };

  const finish = (value) => {
    setAfter(value);
    app.saveReset({
      state,
      before,
      after: value,
      helped: helped.map(c => c.id),
      skipped: skipped.map(c => c.id),
      createdAt: Date.now()
    });
    setPhase('done');
  };

  const stateLabel = RESET_STATES.find(s => s.id === state)?.label;

  // ---------- Deck ----------
  if (phase === 'deck') {
    return (
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setPhase('pick')} className="text-[14px] text-ink-3 hover:text-ink">← Back</button>
          <div className="flex gap-1.5" aria-label={`Card ${position + 1} of ${deck.length}`}>
            {deck.map((c, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i < position ? 'w-6 bg-brand' : i === position ? 'w-6 bg-keystone' : 'w-3 bg-line-strong'}`} />
            ))}
          </div>
          <button onClick={() => setPhase('after')} className="text-[14px] text-brand font-medium hover:underline underline-offset-4">I feel better</button>
        </div>
        <SwipeDeck cards={deck} index={position} onSwipe={onSwipe} />
      </div>
    );
  }

  // ---------- After rating ----------
  if (phase === 'after') {
    return (
      <div className="max-w-xl mx-auto pt-4 sm:pt-10 animate-rise">
        <div className="eyebrow mb-3">Check in</div>
        <h1 className="font-display text-[34px] sm:text-[44px] leading-[1.05] text-ink">
          {stateLabel ? <>How strong is feeling <em>{stateLabel.toLowerCase()}</em> now?</> : 'How strong is it now?'}
        </h1>
        {before != null && <p className="text-[15px] text-ink-3 mt-3">You started at {before}.</p>}
        <div className="mt-8">
          <Scale value={after} onPick={finish} label="Intensity now, 1 to 10" />
          <div className="flex justify-between text-[12px] text-ink-3 mt-2"><span>Barely there</span><span>Overwhelming</span></div>
        </div>
      </div>
    );
  }

  // ---------- Result ----------
  if (phase === 'done') {
    const drop = before != null ? before - after : null;
    return (
      <div className="max-w-xl mx-auto pt-4 sm:pt-8 space-y-6 animate-rise">
        <div className="text-center">
          {before != null ? (
            <div className="flex items-center justify-center gap-5 font-display text-ink">
              <span className="text-[64px] sm:text-[80px] leading-none text-ink-3">{before}</span>
              <ArrowRight className="w-8 h-8 text-keystone" />
              <span className="text-[64px] sm:text-[80px] leading-none">{after}</span>
            </div>
          ) : (
            <div className="font-display text-[64px] leading-none text-ink">{after}<span className="text-2xl text-ink-3">/10</span></div>
          )}
          <p className="font-display italic text-[22px] sm:text-[26px] text-ink-2 mt-5 leading-snug max-w-md mx-auto">
            {shiftMessage(before, after)}
          </p>
          {drop > 0 && <p className="text-[14px] text-ink-3 mt-2">Down {drop} {drop === 1 ? 'point' : 'points'} in about two minutes.</p>}
        </div>

        {helped.length > 0 && (
          <Card className="p-5">
            <div className="eyebrow mb-3">What helped</div>
            <div className="flex flex-wrap gap-2">
              {helped.map(c => (
                <span key={c.id} className="text-[13px] px-3 py-1.5 rounded-full bg-brand-soft text-brand-ink">{c.kind === 'yours' ? 'Your own words' : c.title}</span>
              ))}
            </div>
            <p className="text-[13px] text-ink-3 mt-3">These will come up more often for you.</p>
          </Card>
        )}

        {after >= 8 && (
          <div className="flex gap-3 items-start rounded-card bg-danger-soft border border-danger p-4 text-[14px] text-ink">
            <LifeBuoy className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <span>If this feels unbearable or you don't feel safe, call or text <strong>988</strong> (US) or your local emergency number. Reaching out is a strength, not a failure.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Button size="lg" icon={RotateCcw} onClick={() => start(state, after)}>Another round</Button>
          <Button size="lg" variant="secondary" icon={Layers} onClick={() => app.go('untangle')}>Go deeper</Button>
          <Button size="lg" variant="secondary" icon={MessageCircle} onClick={() => app.go('reflect')}>Talk it through</Button>
          <Button size="lg" variant="ghost" onClick={() => setPhase('pick')}>I'm done</Button>
        </div>
      </div>
    );
  }

  // ---------- Pick a state ----------
  const recent = app.resets.items.filter(r => r.before != null && r.after != null).slice(0, 10);
  const avgBefore = recent.length ? Math.round(recent.reduce((s, r) => s + r.before, 0) / recent.length) : null;
  const avgAfter = recent.length ? Math.round(recent.reduce((s, r) => s + r.after, 0) / recent.length) : null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {app.dueReps.length > 0 && (
        <Card className="p-4 sm:p-5 !bg-keystone-soft !border-keystone flex items-center gap-4 animate-rise">
          <BellRing className="w-5 h-5 text-keystone-ink shrink-0" />
          <p className="flex-1 min-w-0 text-[14px] text-ink truncate"><strong className="font-semibold">Check-in ready:</strong> {app.dueReps[0].text}</p>
          <Button size="sm" onClick={() => app.openCheckIn(app.dueReps[0].id)}>Check in</Button>
        </Card>
      )}

      <header className="pt-1 sm:pt-4">
        <div className="eyebrow mb-3 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-keystone" /> Reset · about two minutes</div>
        <h1 className="font-display text-[38px] sm:text-[52px] leading-[1.03] text-ink">What's hitting you right now?</h1>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {RESET_STATES.map(s => (
          <button
            key={s.id}
            onClick={() => setState(state === s.id ? null : s.id)}
            aria-pressed={state === s.id}
            className={`text-left rounded-2xl border p-4 sm:p-5 transition-all active:scale-[0.98] ${
              state === s.id ? 'bg-brand border-brand' : 'bg-surface border-line hover:border-line-strong shadow-card'
            }`}
          >
            <span className={`block font-display text-[19px] sm:text-[21px] leading-tight ${state === s.id ? 'text-on-brand' : 'text-ink'}`}>{s.label}</span>
            <span className={`block text-[13px] mt-1 leading-snug ${state === s.id ? 'text-on-brand-2' : 'text-ink-3'}`}>{s.hint}</span>
          </button>
        ))}
      </div>

      {state ? (
        <div className="animate-rise">
          <h2 className="text-[15px] font-semibold text-ink mb-3">How strong is it? Tap to start.</h2>
          <Scale value={null} onPick={(n) => start(state, n)} label="Intensity, 1 to 10" />
          <div className="flex justify-between text-[12px] text-ink-3 mt-2"><span>Barely there</span><span>Overwhelming</span></div>
        </div>
      ) : (
        <div className="text-center">
          <button onClick={() => start('any', null)} className="text-[15px] text-brand font-medium hover:underline underline-offset-4">
            Not sure. Just give me something →
          </button>
        </div>
      )}

      {avgBefore != null && (
        <p className="text-center text-[14px] text-ink-3">
          Your last {recent.length === 1 ? 'reset' : `${recent.length} resets`}: on average <strong className="text-ink">{avgBefore} → {avgAfter}</strong>
        </p>
      )}

      <section className="pt-6 border-t border-line">
        <div className="eyebrow mb-3">Want to go deeper?</div>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {[
            { tab: 'untangle', icon: Layers, title: 'Untangle a thought', body: 'Find the hidden rule underneath it.' },
            { tab: 'reflect', icon: MessageCircle, title: 'Talk it through', body: 'A calm, honest conversation.' }
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => app.go(item.tab)}
              className="group flex items-center gap-4 text-left p-4 rounded-2xl border border-line bg-surface hover:border-line-strong transition-colors"
            >
              <span className="w-10 h-10 rounded-full bg-sunken flex items-center justify-center shrink-0">
                <item.icon className="w-5 h-5 text-brand" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-ink text-[15px]">{item.title}</span>
                <span className="block text-[13px] text-ink-3">{item.body}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-ink-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
