import React from 'react';
import { ArrowRight, Layers, MessageCircle, BellRing, Repeat, TrendingUp, Clock } from 'lucide-react';
import { Card, Button, LogoMark } from '../components/ui.jsx';
import { greeting, formatDue, formatDate, plural } from '../lib/format.js';
import { describeRses, RETAKE_INTERVAL_MS } from '../lib/content.js';

function ActionCard({ icon: Icon, eyebrow, title, body, onClick, featured = false }) {
  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-card p-6 sm:p-7 border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift ${
        featured ? 'bg-brand border-brand text-on-brand' : 'bg-surface border-line shadow-card'
      }`}
    >
      <div className="flex items-center justify-between mb-10">
        <span className={`w-10 h-10 rounded-full flex items-center justify-center ${featured ? 'border border-on-brand-2' : 'bg-sunken'}`}>
          <Icon className={`w-5 h-5 ${featured ? 'text-on-brand' : 'text-brand'}`} />
        </span>
        <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${featured ? 'text-on-brand-2' : 'text-ink-3'}`} />
      </div>
      <div className={`eyebrow mb-2 ${featured ? '!text-on-brand-2' : ''}`}>{eyebrow}</div>
      <h3 className={`font-display text-[26px] leading-tight ${featured ? 'text-on-brand' : 'text-ink'}`}>{title}</h3>
      <p className={`text-[15px] leading-relaxed mt-2 ${featured ? 'text-on-brand-2' : 'text-ink-2'}`}>{body}</p>
    </button>
  );
}

function HowItWorks() {
  const steps = [
    ['Notice', 'Catch the moment your worth starts to feel conditional: after a mistake, a silence, a no.'],
    ['Untangle', 'Separate what happened from what it seems to say about you, and name the rule underneath.'],
    ['Practice', 'Take one small action that treats you as already worthy. Log what really happened.']
  ];
  return (
    <section className="rounded-card border border-line p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <LogoMark className="w-6 h-6" />
        <h3 className="font-display text-xl text-ink">How this works</h3>
      </div>
      <ol className="grid md:grid-cols-3 gap-6 md:gap-8">
        {steps.map(([title, body], i) => (
          <li key={title} className="md:border-l md:border-line md:pl-6 first:md:border-l-0 first:md:pl-0">
            <div className="font-display text-keystone text-sm mb-2">0{i + 1}</div>
            <h4 className="font-semibold text-ink text-[16px]">{title}</h4>
            <p className="text-[14px] text-ink-2 leading-relaxed mt-1">{body}</p>
          </li>
        ))}
      </ol>
      <p className="text-[13px] text-ink-3 mt-6 pt-5 border-t border-line">
        Informed by CBT, ACT, Internal Family Systems and self-compassion research. A reflection tool, not therapy.
      </p>
    </section>
  );
}

function MiniCard({ icon: Icon, eyebrow, children, action }) {
  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-ink-3" />
        <span className="eyebrow">{eyebrow}</span>
      </div>
      <div className="flex-1">{children}</div>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export default function Today({ app }) {
  const { rankedRules, recentHitsFor, evidenceFor, dueReps, pendingReps, latestAssessment, retakeDue, rulesById } = app;
  const isNew = app.rules.items.length === 0 && app.ledger.items.length === 0 && app.assessments.items.length === 0;
  const topRule = rankedRules[0];
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="pt-2 sm:pt-6">
        <div className="eyebrow mb-3">{today}</div>
        <h1 className="font-display text-[44px] sm:text-[60px] leading-[1.02] text-ink">
          {greeting()}.
        </h1>
        <p className="font-display italic text-[20px] sm:text-[24px] text-ink-2 mt-3 max-w-2xl leading-snug">
          Your worth isn't on today's to-do list. It's the ground you're standing on.
        </p>
      </header>

      {dueReps.length > 0 && (
        <Card className="p-5 sm:p-6 !bg-keystone-soft !border-keystone flex flex-col sm:flex-row sm:items-center gap-4 animate-rise">
          <div className="flex items-start gap-3.5 flex-1 min-w-0">
            <BellRing className="w-5 h-5 text-keystone-ink mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="font-semibold text-ink text-[15px]">
                {dueReps.length === 1 ? 'A check-in is waiting' : `${dueReps.length} check-ins are waiting`}
              </div>
              <p className="text-[14px] text-ink-2 truncate">{dueReps[0].text}</p>
            </div>
          </div>
          <Button onClick={() => app.openCheckIn(dueReps[0].id)}>Check in</Button>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4 sm:gap-5">
        <ActionCard
          featured
          icon={Layers}
          eyebrow="Untangle"
          title="Something specific is getting to me"
          body="Find the hidden rule underneath a painful thought, and one small way to push back."
          onClick={() => app.go('untangle')}
        />
        <ActionCard
          icon={MessageCircle}
          eyebrow="Reflect"
          title="I want to talk it through"
          body="For when you're not sure what's wrong yet. A calm, honest conversation with no pep talk."
          onClick={() => app.go('reflect')}
        />
      </div>

      {isNew ? (
        <HowItWorks />
      ) : (
        <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
          <MiniCard
            icon={Repeat}
            eyebrow="Strongest pattern"
            action={topRule && <Button size="sm" variant="ghost" className="-ml-3" iconRight={ArrowRight} onClick={() => app.go('insights', { ruleId: topRule.id })}>See pattern</Button>}
          >
            {topRule ? (
              <>
                <h3 className="font-display text-xl text-ink leading-snug">{topRule.label}</h3>
                <p className="text-[13px] text-ink-3 mt-2">
                  {plural(recentHitsFor(topRule.id).length, 'time')} this month · {plural(evidenceFor(topRule.id).length, 'piece')} of evidence against it
                </p>
              </>
            ) : (
              <p className="text-[14px] text-ink-2">Untangle a thought to start seeing your patterns.</p>
            )}
          </MiniCard>

          <MiniCard
            icon={Clock}
            eyebrow="Commitments"
            action={<Button size="sm" variant="ghost" className="-ml-3" iconRight={ArrowRight} onClick={() => app.go('evidence')}>Open evidence</Button>}
          >
            {pendingReps.length ? (
              <ul className="space-y-2.5">
                {pendingReps.slice(0, 2).map(rep => (
                  <li key={rep.id} className="text-[14px]">
                    <span className="text-ink line-clamp-2">{rep.text}</span>
                    <span className="text-[12px] text-ink-3">
                      {rep.dueAt <= app.now ? 'Ready to check in' : `Check-in ${formatDue(rep.dueAt)}`}
                      {rulesById[rep.ruleId] && ` · ${rulesById[rep.ruleId].label}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-2">Nothing pending. Commit to a small rep after you untangle a thought.</p>
            )}
          </MiniCard>

          <MiniCard
            icon={TrendingUp}
            eyebrow="Self-esteem"
            action={
              retakeDue ? (
                <Button size="sm" variant="soft" onClick={app.openAssessment}>{latestAssessment ? 'Retake check-in' : 'Set a baseline'}</Button>
              ) : (
                <Button size="sm" variant="ghost" className="-ml-3" iconRight={ArrowRight} onClick={() => app.go('insights')}>See trend</Button>
              )
            }
          >
            {latestAssessment ? (
              <>
                <div className="font-display text-[34px] leading-none text-ink">
                  {latestAssessment.score}<span className="text-lg text-ink-3">/30</span>
                </div>
                <p className="text-[13px] text-ink-3 mt-2">
                  {describeRses(latestAssessment.score)} · {retakeDue ? 'Due for a retake' : `Next check-in ${formatDate(latestAssessment.createdAt + RETAKE_INTERVAL_MS)}`}
                </p>
              </>
            ) : (
              <p className="text-[14px] text-ink-2">A two-minute baseline lets you see whether things are shifting.</p>
            )}
          </MiniCard>
        </div>
      )}

      {isNew && (
        <Card className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="font-semibold text-ink text-[15px]">Set your baseline</div>
            <p className="text-[14px] text-ink-2">Ten quick statements, about two minutes. Retake every two weeks to see change.</p>
          </div>
          <Button variant="secondary" onClick={app.openAssessment}>Start check-in</Button>
        </Card>
      )}
    </div>
  );
}
