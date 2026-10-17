import React from 'react';
import { Plus, Trash2, Repeat, Clock, BookMarked } from 'lucide-react';
import { Card, Button, FieldLabel, CategoryTag, EmptyState } from '../components/ui.jsx';
import { EVIDENCE_CATEGORIES, categoryFor } from '../lib/content.js';
import { formatDate, formatDue } from '../lib/format.js';

export default function Evidence({ app }) {
  const {
    ledgerItems, rulesById, rankedRules, pendingReps, now,
    newTitle, setNewTitle, newReflection, setNewReflection, newCategory, setNewCategory,
    newRuleId, setNewRuleId, submitEvidence, deleteEvidence, filter, setFilter
  } = app;
  const filtered = filter === 'all' ? ledgerItems : ledgerItems.filter(item => item.category === filter);

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <div className="eyebrow mb-2">Evidence</div>
        <h1 className="font-display text-[30px] sm:text-[40px] leading-[1.1] text-ink">Proof you already count</h1>
        <p className="text-[15px] text-ink-2 leading-relaxed mt-3">
          Brains hold on to failures and let moments of worth slide past. This isn't a list of achievements. It's a record of times you treated yourself as worthy anyway.
        </p>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 items-start">
        <Card className="p-6 sm:p-7 lg:sticky lg:top-28">
          <h2 className="font-display text-xl text-ink mb-5">Log a moment</h2>
          <form onSubmit={submitEvidence} className="space-y-5">
            <div>
              <FieldLabel htmlFor="ev-title">What did you do?</FieldLabel>
              <input id="ev-title" type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Took a real lunch break without apologizing" className="field" />
            </div>

            <fieldset>
              <legend className="text-[13px] font-semibold text-ink mb-2">What kind of moment was it?</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EVIDENCE_CATEGORIES.map(cat => (
                  <button
                    type="button"
                    key={cat.id}
                    aria-pressed={newCategory === cat.id}
                    onClick={() => setNewCategory(cat.id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      newCategory === cat.id ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-strong'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                      <span className={`w-2 h-2 rounded-full ${cat.dot}`} />
                      {cat.label}
                    </span>
                    <span className="block text-[12px] text-ink-3 mt-1 leading-snug">{cat.description}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <FieldLabel htmlFor="ev-why" hint="(optional)">Why does it matter?</FieldLabel>
              <textarea id="ev-why" rows={3} value={newReflection} onChange={(e) => setNewReflection(e.target.value)} placeholder="My inbox wasn't empty, and I still didn't have to earn the right to breathe." className="field resize-none" />
            </div>

            {rankedRules.length > 0 && (
              <div>
                <FieldLabel htmlFor="ev-rule" hint="(optional)">Which rule does it push back on?</FieldLabel>
                <select id="ev-rule" value={newRuleId} onChange={(e) => setNewRuleId(e.target.value)} className="field">
                  <option value="">None, or not sure</option>
                  {rankedRules.map(rule => <option key={rule.id} value={rule.id}>{rule.label}</option>)}
                </select>
              </div>
            )}

            <Button type="submit" size="lg" icon={Plus} className="w-full" disabled={!newTitle.trim()}>Add to evidence</Button>
          </form>
        </Card>

        <div className="space-y-6 min-w-0">
          {pendingReps.length > 0 && (
            <section>
              <h2 className="eyebrow flex items-center gap-1.5 mb-3"><Clock className="w-3.5 h-3.5" /> Committed reps</h2>
              <div className="space-y-2">
                {pendingReps.map(rep => {
                  const isDue = rep.dueAt <= now;
                  return (
                    <Card key={rep.id} className={`p-4 flex items-center gap-4 ${isDue ? '!border-keystone !bg-keystone-soft' : ''}`}>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] text-ink leading-snug">{rep.text}</p>
                        <p className={`text-[12px] mt-1 ${isDue ? 'text-keystone-ink font-semibold' : 'text-ink-3'}`}>
                          {isDue ? 'Ready to check in' : `Check-in ${formatDue(rep.dueAt)}`}
                          {rulesById[rep.ruleId] && ` · ${rulesById[rep.ruleId].label}`}
                        </p>
                      </div>
                      <Button size="sm" variant={isDue ? 'primary' : 'secondary'} onClick={() => app.openCheckIn(rep.id)}>Check in</Button>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1" role="tablist" aria-label="Filter by kind">
            {[{ id: 'all', short: `All · ${ledgerItems.length}` }, ...EVIDENCE_CATEGORIES].map(cat => (
              <button
                key={cat.id}
                role="tab"
                aria-selected={filter === cat.id}
                onClick={() => setFilter(cat.id)}
                className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-medium border whitespace-nowrap transition-colors ${
                  filter === cat.id ? 'bg-ink text-bg border-ink' : 'border-line text-ink-2 hover:border-line-strong'
                }`}
              >
                {cat.dot && <span className={`w-2 h-2 rounded-full ${cat.dot}`} />}
                {cat.short}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={BookMarked} title="Nothing here yet">
              Every time you rest without apologizing, hold a boundary, or refuse to attack yourself after a mistake, log it. It adds up.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {filtered.map(item => {
                const linkedRule = rulesById[item.ruleId];
                return (
                  <Card key={item.id} as="article" className="p-5 sm:p-6 group">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <CategoryTag category={categoryFor(item.category)} />
                        <span className="text-[12px] text-ink-3">
                          {formatDate(item.createdAt)}{item.source ? ` · ${item.source}` : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteEvidence(item.id)}
                        className="p-1.5 -m-1.5 rounded-lg text-ink-3 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        aria-label="Remove entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="font-display text-[20px] leading-snug text-ink">{item.title}</h3>
                    <p className="text-[15px] text-ink-2 leading-relaxed mt-1.5">{item.reflection}</p>
                    {linkedRule && (
                      <p className="text-[13px] text-ink-3 mt-3 pt-3 border-t border-line flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5 text-rule" />
                        Pushes back on <span className="text-ink font-medium">{linkedRule.label}</span>
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
