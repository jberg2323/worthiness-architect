import React, { useState, useEffect } from 'react';
import { LifeBuoy, Download, Trash2, RefreshCw } from 'lucide-react';
import { Modal, Button, FieldLabel } from './ui.jsx';
import { CHECKIN_OPTIONS, RSES_ITEMS, RSES_OPTIONS } from '../lib/content.js';

export function CrisisCard({ onContinue }) {
  return (
    <div className="rounded-card border border-danger bg-danger-soft p-5 sm:p-6 flex gap-4 animate-rise" role="alert">
      <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center shrink-0">
        <LifeBuoy className="w-5 h-5 text-danger" />
      </div>
      <div className="text-[15px] text-ink leading-relaxed">
        <p className="font-display text-lg text-ink mb-1">It sounds like you're carrying something heavy.</p>
        <p className="text-ink-2">
          If you're thinking about harming yourself or don't feel safe, please reach out now. Call or text <strong className="text-ink">988</strong> (US Suicide &amp; Crisis Lifeline), or your local emergency number. Telling someone you trust counts too. You don't have to earn the right to ask for help.
        </p>
        {onContinue && (
          <button onClick={onContinue} className="mt-3 text-[13px] text-ink-3 hover:text-ink underline underline-offset-4">
            I'm safe. Continue with the analysis.
          </button>
        )}
      </div>
    </div>
  );
}

// A 4-in / 6-out breath, paced by the animated ring (10s per cycle)
export function GroundingDialog({ onClose }) {
  const [phase, setPhase] = useState('in');
  useEffect(() => {
    let timer;
    const cycle = (p) => {
      setPhase(p);
      timer = setTimeout(() => cycle(p === 'in' ? 'out' : 'in'), p === 'in' ? 4000 : 6000);
    };
    cycle('in');
    return () => clearTimeout(timer);
  }, []);

  const steps = [
    ['Drop the armor', 'Unclench your jaw. Let your tongue rest. Lower your shoulders away from your ears.'],
    ['Name the protector', '"A part of me is scared I\'m not enough right now. I can notice it without obeying it."'],
    ['Return to the foundation', '"My actions can be adjusted. My worth is the ground I\'m standing on."']
  ];

  return (
    <Modal title="Pause for one minute" eyebrow="Grounding" onClose={onClose}>
      <p className="text-[15px] text-ink-2 leading-relaxed">
        When your worth feels threatened, your body reacts as if the danger were physical. Settle the body first; the thoughts follow.
      </p>

      <div className="my-8 flex flex-col items-center" aria-live="polite">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-brand-soft animate-breathe" />
          <div className="absolute inset-6 rounded-full border border-brand opacity-40" />
          <span className="relative font-display text-xl text-brand-ink">
            {phase === 'in' ? 'Breathe in' : 'Breathe out'}
          </span>
        </div>
        <span className="text-[13px] text-ink-3 mt-3">In for 4 · out for 6</span>
      </div>

      <ol className="space-y-4">
        {steps.map(([title, body], i) => (
          <li key={title} className="flex gap-4">
            <span className="font-display text-keystone text-lg leading-6 w-5 shrink-0">{i + 1}</span>
            <div>
              <h4 className="font-semibold text-ink text-[15px]">{title}</h4>
              <p className="text-[14px] text-ink-2 mt-0.5 leading-relaxed">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <Button size="lg" className="w-full mt-8" onClick={onClose}>I'm ready to continue</Button>
    </Modal>
  );
}

export function CheckInDialog({ rep, ruleLabel, onClose, onDone, onSnooze, onRelease }) {
  const [step, setStep] = useState('ask'); // 'ask' | 'done' | 'later' | 'release'
  const [predicted, setPredicted] = useState('');
  const [actual, setActual] = useState('');
  const [note, setNote] = useState('');

  return (
    <Modal title="How did it go?" eyebrow="Check-in" onClose={onClose}>
      <div className="rounded-2xl bg-sunken p-4 mb-6">
        <div className="eyebrow mb-1.5">You committed to</div>
        <p className="text-[15px] text-ink leading-relaxed">{rep.text}</p>
        {ruleLabel && <p className="text-[13px] text-ink-3 mt-2">Testing the rule <em className="text-rule not-italic font-medium">{ruleLabel}</em></p>}
      </div>

      {step === 'ask' && (
        <div className="space-y-2.5">
          <Button size="lg" className="w-full" onClick={() => setStep('done')}>Yes, I did it</Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={() => setStep('later')}>Not yet</Button>
          <Button variant="ghost" className="w-full" onClick={() => setStep('release')}>I'm letting this one go</Button>
        </div>
      )}

      {step === 'done' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onDone({ predicted: predicted.trim(), actual: actual.trim() });
          }}
          className="space-y-5"
        >
          <p className="text-[15px] text-ink-2 leading-relaxed">
            Put the critic's forecast next to what really happened. That gap is the evidence that slowly loosens a rule.
          </p>
          <div>
            <FieldLabel htmlFor="predicted">What did your critic predict?</FieldLabel>
            <textarea id="predicted" rows={2} value={predicted} onChange={(e) => setPredicted(e.target.value)} placeholder="Everyone will think I'm lazy." className="field resize-none" />
          </div>
          <div>
            <FieldLabel htmlFor="actual">What actually happened?</FieldLabel>
            <textarea id="actual" rows={2} value={actual} onChange={(e) => setActual(e.target.value)} placeholder="Nobody noticed. I felt guilty for ten minutes, then calmer." className="field resize-none" />
          </div>
          <Button type="submit" size="lg" className="w-full">Add to my evidence</Button>
        </form>
      )}

      {step === 'later' && (
        <div className="space-y-2.5">
          <p className="text-[15px] text-ink-2 mb-4">That's fine. When should I check back?</p>
          {CHECKIN_OPTIONS.map(opt => (
            <Button key={opt.id} size="lg" variant="secondary" className="w-full" onClick={() => onSnooze(opt)}>{opt.label}</Button>
          ))}
        </div>
      )}

      {step === 'release' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRelease(note.trim());
          }}
          className="space-y-5"
        >
          <p className="text-[15px] text-ink-2 leading-relaxed">
            Letting a rep go isn't a verdict on you. It tells you something about what's hard right now.
          </p>
          <div>
            <FieldLabel htmlFor="note" hint="(optional)">What got in the way?</FieldLabel>
            <textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="field resize-none" />
          </div>
          <Button type="submit" size="lg" variant="secondary" className="w-full">Let it go</Button>
        </form>
      )}
    </Modal>
  );
}

export function AssessmentDialog({ onClose, onSubmit }) {
  const [answers, setAnswers] = useState(Array(RSES_ITEMS.length).fill(null));
  const answered = answers.filter(a => a !== null).length;
  const complete = answered === RSES_ITEMS.length;

  return (
    <Modal title="How you see yourself, lately" eyebrow="Self-esteem check-in · 2 minutes" onClose={onClose} wide>
      <p className="text-[15px] text-ink-2 leading-relaxed mb-6">
        Ten statements from the Rosenberg Self-Esteem Scale, a widely used research measure. Answer for how you generally feel right now. It's a baseline, not a grade.
      </p>
      <div className="h-1 rounded-full bg-sunken overflow-hidden mb-6" aria-hidden="true">
        <div className="h-full bg-brand transition-all duration-300" style={{ width: `${(answered / RSES_ITEMS.length) * 100}%` }} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (complete) onSubmit(answers);
        }}
        className="space-y-6"
      >
        {RSES_ITEMS.map((item, i) => (
          <fieldset key={i}>
            <legend className="text-[15px] text-ink mb-3 flex gap-3">
              <span className="font-display text-ink-3 w-5 shrink-0">{i + 1}</span>
              <span>{item.text}</span>
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:pl-8">
              {RSES_OPTIONS.map((opt, optIdx) => (
                <button
                  type="button"
                  key={opt}
                  aria-pressed={answers[i] === optIdx}
                  onClick={() => setAnswers(prev => prev.map((a, j) => (j === i ? optIdx : a)))}
                  className={`h-10 px-2 rounded-xl text-[13px] font-medium border transition-all ${
                    answers[i] === optIdx
                      ? 'bg-brand text-on-brand border-brand'
                      : 'bg-surface text-ink-2 border-line hover:border-line-strong'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        <Button type="submit" size="lg" className="w-full" disabled={!complete}>
          {complete ? 'Save check-in' : `${answered} of ${RSES_ITEMS.length} answered`}
        </Button>
      </form>
    </Modal>
  );
}

function Section({ title, children }) {
  return (
    <section className="py-5 border-t border-line first:border-t-0 first:pt-0">
      <h4 className="font-semibold text-ink text-[15px] mb-1.5">{title}</h4>
      <div className="text-[14px] text-ink-2 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export function PrivacyDialog({ counts, saveEnabled, onToggleSave, onExport, onDeleteAll, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <Modal title="Your data, plainly" eyebrow="Privacy" onClose={onClose}>
      <Section title="Where it lives">
        <p>
          Everything you save stays in this browser, on this device. There's no account and no server copy, and nobody else can see it, including us. Clearing your browser data deletes it, and it won't follow you to another device.
        </p>
        <p className="text-ink-3 text-[13px]">
          Saved now: {counts.evidence} evidence entries, {counts.rules} patterns ({counts.hits} moments), {counts.reps} commitments, {counts.assessments} check-ins. Conversations aren't saved.
        </p>
      </Section>
      <Section title="What the AI sees">
        <p>
          When you use Reflect or Untangle, your text passes through our server to an AI model (Google Gemini, via Vercel AI Gateway) to write a response. Reflect also receives short summaries of your recurring patterns so it can remember them. Our server doesn't store what you send; the AI provider's handling is governed by its own terms.
        </p>
      </Section>
      <Section title="Your controls">
        <label className="flex items-start gap-3 cursor-pointer p-3 -mx-3 rounded-xl hover:bg-sunken">
          <input type="checkbox" checked={!saveEnabled} onChange={(e) => onToggleSave(!e.target.checked)} className="mt-1 w-4 h-4 accent-[var(--brand)]" />
          <span>
            <span className="font-medium text-ink block">Don't save new entries</span>
            New entries stay in this tab only and disappear on reload. What's already saved isn't affected.
          </span>
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <Button variant="secondary" icon={Download} className="flex-1" onClick={onExport}>Export my data</Button>
          {!confirming ? (
            <Button variant="danger-outline" icon={Trash2} className="flex-1" onClick={() => setConfirming(true)}>Delete everything</Button>
          ) : (
            <Button
              variant="danger"
              icon={deleting ? RefreshCw : Trash2}
              className="flex-1"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                await onDeleteAll();
                setDeleting(false);
              }}
            >
              Yes, delete it all
            </Button>
          )}
        </div>
        {confirming && (
          <p className="text-[13px] text-danger">This removes every entry, pattern, check-in and commitment for good. Export first if you want a copy.</p>
        )}
      </Section>
    </Modal>
  );
}
