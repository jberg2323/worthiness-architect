import React, { useState } from 'react';
import { Plus, ArrowRight, Repeat, Trash2, TrendingUp, ChevronDown, Layers } from 'lucide-react';
import { Card, Button, EmptyState } from '../components/ui.jsx';
import ScoreChart from '../components/ScoreChart.jsx';
import { describeRses, RETAKE_INTERVAL_MS, PATTERN_WINDOW_MS } from '../lib/content.js';
import { formatDate, plural } from '../lib/format.js';

function Stat({ value, label }) {
  return (
    <div className="py-4 sm:py-0 sm:px-6 first:sm:pl-0 border-t sm:border-t-0 sm:border-l border-line first:border-0">
      <div className="font-display text-[36px] leading-none text-ink">{value}</div>
      <div className="text-[13px] text-ink-2 mt-2">{label}</div>
    </div>
  );
}

function PatternCard({ rule, app, expanded, onToggle }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const recent = app.recentHitsFor(rule.id);
  const all = app.allHitsFor(rule.id);
  const evidence = app.evidenceFor(rule.id);
  const reps = app.reps.items.filter(r => r.ruleId === rule.id);
  const avgIntensity = recent.length
    ? (recent.reduce((s, h) => s + (h.intensity || 0), 0) / recent.length).toFixed(1)
    : null;

  // Four weekly buckets for the last 30 days, oldest first
  const weeks = [3, 2, 1, 0].map(w =>
    all.filter(h => h.createdAt <= app.now - w * 7 * 86400000 && h.createdAt > app.now - (w + 1) * 7 * 86400000).length
  );
  const peak = Math.max(1, ...weeks);

  return (
    <Card as="article" className="overflow-hidden">
      <div className="p-6 sm:p-7">
        <div className="flex items-start gap-5">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[24px] leading-tight text-ink">{rule.label}</h3>
            <p className="font-display italic text-[16px] text-ink-2 mt-2 leading-snug">“{rule.statement}”</p>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display text-[40px] leading-none text-ink">{recent.length}</div>
            <div className="text-[12px] text-ink-3 mt-1">this month</div>
            <div className="flex items-end gap-1 h-6 mt-2 justify-end" aria-label={`Weekly occurrences: ${weeks.join(', ')}`}>
              {weeks.map((n, i) => (
                <span key={i} className="w-2 rounded-sm bg-rule" style={{ height: `${Math.max(3, (n / peak) * 24)}px`, opacity: n ? 1 : 0.25 }} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-3 mt-4">
          <span>{plural(all.length, 'time')} total</span>
          {avgIntensity && <span>Avg. intensity {avgIntensity}/10</span>}
          <span>Last seen {formatDate(rule.lastSeenAt || rule.createdAt)}</span>
          {reps.length > 0 && <span>{reps.filter(r => r.status === 'done').length} of {plural(reps.length, 'rep')} done</span>}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-sunken overflow-hidden" aria-hidden="true">
            <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(100, (evidence.length / Math.max(1, all.length)) * 100)}%` }} />
          </div>
          <span className="text-[13px] text-brand font-medium whitespace-nowrap">{plural(evidence.length, 'piece')} of evidence against it</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-6">
          <Button size="sm" icon={Plus} onClick={() => app.logEvidenceAgainst(rule)}>Log evidence against it</Button>
          <Button size="sm" variant="secondary" iconRight={ArrowRight} disabled={app.isChatLoading} onClick={() => app.exploreRule(rule)}>Talk it through</Button>
          <Button size="sm" variant="ghost" onClick={onToggle} aria-expanded={expanded}>
            {expanded ? 'Hide history' : 'Show history'}
            <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </Button>
          <div className="ml-auto">
            {confirmDelete ? (
              <span className="flex items-center gap-3 text-[13px]">
                <button onClick={() => app.deleteRule(rule.id)} className="text-danger font-medium">Delete pattern</button>
                <button onClick={() => setConfirmDelete(false)} className="text-ink-3">Cancel</button>
              </span>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="p-1.5 rounded-lg text-ink-3 hover:text-danger" aria-label="Delete pattern">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="grid md:grid-cols-2 border-t border-line bg-sunken animate-rise">
          <div className="p-6 sm:p-7">
            <h4 className="eyebrow mb-4">When it showed up</h4>
            <ol className="space-y-4">
              {[...all].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6).map(hit => (
                <li key={hit.id} className="relative pl-5 before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:rounded-full before:bg-rule">
                  <div className="text-[12px] text-ink-3">{formatDate(hit.createdAt)} · intensity {hit.intensity}/10</div>
                  <div className="text-[14px] text-ink mt-0.5 italic">“{hit.thought}”</div>
                </li>
              ))}
            </ol>
          </div>
          <div className="p-6 sm:p-7 border-t md:border-t-0 md:border-l border-line">
            <h4 className="eyebrow mb-4">Evidence against it</h4>
            {evidence.length === 0 ? (
              <p className="text-[14px] text-ink-2 leading-relaxed">
                Nothing yet. Each time you act against this rule and the sky doesn't fall, log it. That record is what weakens the rule.
              </p>
            ) : (
              <ol className="space-y-4">
                {[...evidence].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6).map(item => (
                  <li key={item.id} className="relative pl-5 before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:rounded-full before:bg-brand">
                    <div className="text-[12px] text-ink-3">{formatDate(item.createdAt)}</div>
                    <div className="text-[14px] text-ink font-medium mt-0.5">{item.title}</div>
                    <div className="text-[13px] text-ink-2 mt-0.5">{item.reflection}</div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Insights({ app }) {
  const { rankedRules, sortedAssessments, latestAssessment, retakeDue, expandedRuleId, setExpandedRuleId, now } = app;
  const untangled30d = app.ruleHits.items.filter(h => h.createdAt >= now - PATTERN_WINDOW_MS).length;
  const repsDone = app.reps.items.filter(r => r.status === 'done').length;

  return (
    <div className="space-y-12">
      <header>
        <div className="eyebrow mb-2">Insights</div>
        <h1 className="font-display text-[30px] sm:text-[40px] leading-[1.1] text-ink">The rules you live by, and how they're changing</h1>
        <Card className="mt-8 p-6 grid sm:grid-cols-4">
          <Stat value={untangled30d} label="Thoughts untangled this month" />
          <Stat value={rankedRules.length} label="Patterns identified" />
          <Stat value={repsDone} label="Reps completed" />
          <Stat value={app.ledger.items.length} label="Pieces of evidence" />
        </Card>
      </header>

      <section>
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-[26px] text-ink">Your patterns</h2>
            <p className="text-[14px] text-ink-2 mt-1">Ranked by how often each rule showed up in the last 30 days.</p>
          </div>
        </div>
        {rankedRules.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No patterns yet"
            action={<Button icon={Layers} onClick={() => app.go('untangle')}>Untangle a thought</Button>}
          >
            Each thought you untangle is matched to the rule underneath it. Repeats show up here.
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {rankedRules.map(rule => (
              <PatternCard
                key={rule.id}
                rule={rule}
                app={app}
                expanded={expandedRuleId === rule.id}
                onToggle={() => setExpandedRuleId(expandedRuleId === rule.id ? null : rule.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-[26px] text-ink">How you see yourself</h2>
            <p className="text-[14px] text-ink-2 mt-1 max-w-xl">Rosenberg Self-Esteem Scale, 0 to 30. Retake every two weeks. A reflection, not a diagnosis.</p>
          </div>
          <Button variant={retakeDue ? 'primary' : 'secondary'} icon={TrendingUp} onClick={app.openAssessment}>
            {latestAssessment ? 'Take a check-in' : 'Set your baseline'}
          </Button>
        </div>

        {sortedAssessments.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No check-ins yet">Your baseline takes about two minutes.</EmptyState>
        ) : (
          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-6">
              <span className="font-display text-[48px] leading-none text-ink">
                {latestAssessment.score}<span className="text-xl text-ink-3">/30</span>
              </span>
              <span className="text-[15px] text-ink-2">{describeRses(latestAssessment.score)}</span>
              {sortedAssessments.length > 1 && (() => {
                const delta = latestAssessment.score - sortedAssessments[0].score;
                return <span className="text-[15px] text-ink-2">· {delta > 0 ? '+' : ''}{delta} since your baseline</span>;
              })()}
            </div>
            <ScoreChart points={sortedAssessments} />
            {!retakeDue && (
              <p className="text-[13px] text-ink-3 mt-3">Next check-in suggested {formatDate(latestAssessment.createdAt + RETAKE_INTERVAL_MS)}.</p>
            )}
            <table className="w-full text-[14px] mt-6">
              <caption className="sr-only">All check-ins</caption>
              <thead>
                <tr className="text-left text-ink-3 border-b border-line">
                  <th className="font-medium py-2.5">Date</th>
                  <th className="font-medium py-2.5">Score</th>
                  <th className="font-medium py-2.5">Range</th>
                  <th className="py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {[...sortedAssessments].reverse().map(a => (
                  <tr key={a.id} className="border-b border-line last:border-0 text-ink">
                    <td className="py-2.5">{formatDate(a.createdAt)}</td>
                    <td className="py-2.5 font-medium">{a.score}/30</td>
                    <td className="py-2.5 text-ink-2">{describeRses(a.score)}</td>
                    <td className="py-2.5 text-right">
                      <button onClick={() => app.assessments.remove(a.id)} className="p-1 text-ink-3 hover:text-danger" aria-label={`Remove check-in from ${formatDate(a.createdAt)}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}
