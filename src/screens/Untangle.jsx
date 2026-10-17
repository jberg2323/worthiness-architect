import React from 'react';
import { ArrowRight, Repeat, Target, Check, MessageCircle } from 'lucide-react';
import { Card, Button } from '../components/ui.jsx';
import { CrisisCard } from '../components/dialogs.jsx';
import { UNTANGLE_EXAMPLES, CHECKIN_OPTIONS } from '../lib/content.js';

const INTENSITY_WORDS = ['', 'Faint', 'Faint', 'Mild', 'Mild', 'Noticeable', 'Strong', 'Strong', 'Intense', 'Intense', 'Overwhelming'];

function Row({ n, label, children }) {
  return (
    <div className="grid md:grid-cols-[200px_1fr] gap-2 md:gap-10 py-7 border-t border-line first:border-t-0">
      <div>
        <div className="font-display text-keystone text-sm">{n}</div>
        <div className="text-[13px] font-semibold text-ink mt-1">{label}</div>
      </div>
      <div className="text-[16px] text-ink leading-[1.7]">{children}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <Card className="p-8 sm:p-10" aria-busy="true">
      <p className="font-display italic text-xl text-ink-2 mb-8">Looking underneath the thought…</p>
      <div className="space-y-6">
        {[0, 1, 2].map(i => (
          <div key={i} className="grid md:grid-cols-[200px_1fr] gap-4 md:gap-10">
            <div className="h-3 w-24 rounded bg-sunken animate-pulse" />
            <div className="space-y-2.5">
              <div className="h-3 rounded bg-sunken animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-sunken animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Untangle({ app }) {
  const {
    rawThought, setRawThought, intensity, setIntensity, isUntangling, result, untangleCrisis,
    showCommitOptions, setShowCommitOptions, untangle, commitToRep, logResultNow, recentHitsFor
  } = app;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="p-6 sm:p-10">
        <div className="eyebrow mb-2">Untangle</div>
        <h1 className="font-display text-[30px] sm:text-[40px] leading-[1.1] text-ink max-w-2xl">
          What is your inner critic saying?
        </h1>
        <p className="text-[15px] text-ink-2 leading-relaxed mt-3 max-w-2xl">
          Shame says <em>"I am bad."</em> The facts usually say something smaller: <em>"Something happened that didn't go well."</em> Write the thought exactly as it sounds in your head.
        </p>

        <form onSubmit={untangle} className="mt-8">
          <label htmlFor="thought" className="sr-only">The thought</label>
          <textarea
            id="thought"
            rows={3}
            value={rawThought}
            onChange={(e) => setRawThought(e.target.value)}
            placeholder="I stumbled through the presentation. Everyone knows I'm not good enough…"
            className="w-full resize-none bg-sunken border border-line rounded-2xl px-5 py-4 font-display italic text-[20px] sm:text-[22px] leading-snug text-ink placeholder:text-ink-3 placeholder:not-italic placeholder:font-sans placeholder:text-[16px] focus:outline-none focus:border-brand focus:bg-surface transition-colors"
          />

          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mt-3">
            <span className="text-[13px] text-ink-3">Try one:</span>
            {UNTANGLE_EXAMPLES.map((example, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRawThought(example)}
                className="text-[13px] text-ink-2 hover:text-ink px-3 py-1 rounded-full border border-line hover:border-line-strong transition-colors max-w-[280px] truncate"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-6 mt-8 pt-6 border-t border-line">
            <div className="flex-1 max-w-sm">
              <div className="flex items-baseline justify-between mb-2">
                <label htmlFor="intensity" className="text-[13px] font-semibold text-ink">How strong is it?</label>
                <span className="text-[13px] text-ink-2"><strong className="text-ink">{intensity}</strong>/10 · {INTENSITY_WORDS[intensity]}</span>
              </div>
              <input
                id="intensity"
                type="range"
                min="1"
                max="10"
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full accent-[var(--brand)] cursor-pointer"
              />
            </div>
            <Button type="submit" size="lg" iconRight={ArrowRight} disabled={!rawThought.trim() || isUntangling}>
              {isUntangling ? 'Untangling…' : 'Untangle it'}
            </Button>
          </div>
        </form>
      </Card>

      {untangleCrisis && <CrisisCard onContinue={() => untangle(null, { skipCrisisCheck: true })} />}

      {isUntangling && <LoadingState />}

      {result && !isUntangling && (
        <article className="space-y-5 animate-rise">
          {result.isFallback && (
            <p className="text-[14px] text-ink-2 bg-sunken rounded-2xl px-5 py-3.5">
              The AI couldn't be reached, so this is a general reading rather than one about your thought. It hasn't been added to your patterns.
            </p>
          )}

          <Card className="p-6 sm:p-10">
            <div className="eyebrow mb-3">Underneath this thought</div>
            <p className="font-display italic text-[22px] sm:text-[26px] leading-snug text-ink-2 mb-6">
              “{result.originalThought}”
            </p>

            <Row n="01" label="The verdict vs. the facts">{result.shameVsGuilt}</Row>
            <Row n="02" label="Where you've fused">{result.fusionTrap}</Row>
            <Row n="03" label="The hidden rule">
              <blockquote className="font-display italic text-[20px] leading-snug text-ink border-l-[3px] border-rule bg-rule-soft rounded-r-xl px-5 py-4">
                {result.hiddenRule}
              </blockquote>
              {result.ruleId ? (
                <button
                  onClick={() => app.go('insights', { ruleId: result.ruleId })}
                  className="mt-3 inline-flex items-center gap-2 text-[14px] text-ink-2 hover:text-ink group"
                >
                  <Repeat className="w-4 h-4 text-rule" />
                  <span>
                    <strong className="font-semibold text-ink">{result.ruleLabel}</strong>
                    {' · '}
                    {result.isRecurring
                      ? `${recentHitsFor(result.ruleId).length} times this month`
                      : 'New pattern, now tracked'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              ) : (
                <p className="text-[14px] text-ink-3 mt-3">Notice how the rule treats worth like a subscription you have to renew every day.</p>
              )}
            </Row>
            <Row n="04" label="What the critic is protecting">
              {result.protectorMotive}
              <p className="text-[14px] text-ink-3 italic mt-3">You don't have to fight it. Thank it for trying to keep you safe, then let it step back.</p>
            </Row>
          </Card>

          <div className="rounded-card bg-brand text-on-brand p-7 sm:p-10 shadow-card">
            <div className="eyebrow !text-on-brand-2 mb-4">A truer sentence</div>
            <p className="font-display text-[24px] sm:text-[30px] leading-[1.3]">{result.groundedReframe}</p>
          </div>

          <Card className="p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="flex-1">
                <div className="eyebrow mb-2">One small rep</div>
                <p className="text-[17px] text-ink leading-relaxed">{result.microRep}</p>
                <p className="text-[14px] text-ink-3 mt-2">Commit to it and I'll check in afterward, so you can compare the critic's prediction with what really happened.</p>
              </div>
              <div className="md:w-64 shrink-0">
                {result.committed ? (
                  <p className="flex items-center gap-2 text-[15px] text-brand font-medium"><Check className="w-4 h-4" /> Committed. Watch for the check-in.</p>
                ) : result.logged ? (
                  <p className="flex items-center gap-2 text-[15px] text-brand font-medium"><Check className="w-4 h-4" /> Added to your evidence.</p>
                ) : showCommitOptions ? (
                  <div className="space-y-2">
                    <div className="text-[13px] font-semibold text-ink mb-1">Check in with me…</div>
                    {CHECKIN_OPTIONS.map(opt => (
                      <Button key={opt.id} variant="secondary" className="w-full" onClick={() => commitToRep(opt)}>{opt.label}</Button>
                    ))}
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowCommitOptions(false)}>Cancel</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button className="w-full" icon={Target} onClick={() => setShowCommitOptions(true)}>Commit to this</Button>
                    <Button variant="secondary" className="w-full" icon={Check} onClick={logResultNow}>I already did it</Button>
                    <Button
                      variant="ghost"
                      className="w-full"
                      icon={MessageCircle}
                      disabled={app.isChatLoading}
                      onClick={() => {
                        app.go('reflect');
                        app.sendMessage(`I just untangled this thought: "${result.originalThought}". The hidden rule underneath was: ${result.hiddenRule}. Can you help me work with the part of me that still feels anxious about it?`);
                      }}
                    >
                      Talk it through
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </article>
      )}
    </div>
  );
}
