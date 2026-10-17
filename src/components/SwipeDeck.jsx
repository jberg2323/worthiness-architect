import React, { useState, useRef, useEffect } from 'react';
import { Wind, Hand, Eye, Lightbulb, Heart, Footprints, Sparkles, X, Check, Play, RotateCcw } from 'lucide-react';
import { CARD_KINDS } from '../lib/cards.js';

const KIND_ICONS = { breath: Wind, body: Hand, perspective: Eye, reframe: Lightbulb, kindness: Heart, action: Footprints, yours: Sparkles };
const SWIPE_DISTANCE = 100;
const SWIPE_VELOCITY = 0.6; // px per ms

function CardTimer({ seconds, dark }) {
  const [left, setLeft] = useState(null); // null = not started
  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  useEffect(() => {
    if (left === 0) navigator.vibrate?.([20, 60, 20]);
  }, [left]);

  const r = 18;
  const c = 2 * Math.PI * r;
  const progress = left === null ? 0 : 1 - left / seconds;

  if (left === null) {
    return (
      <button
        onClick={() => setLeft(seconds)}
        className={`inline-flex items-center gap-2 h-10 pl-3 pr-4 rounded-full text-[14px] font-medium transition-colors ${
          dark ? 'bg-on-brand text-brand' : 'bg-brand-soft text-brand-ink hover:brightness-95'
        }`}
      >
        <Play className="w-4 h-4" /> Start · {seconds}s
      </button>
    );
  }
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <svg viewBox="0 0 44 44" className="w-11 h-11 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3" stroke={dark ? 'var(--on-brand-2)' : 'var(--sunken)'} />
        <circle
          cx="22" cy="22" r={r} fill="none" strokeWidth="3" strokeLinecap="round"
          stroke={dark ? 'var(--on-brand)' : 'var(--brand)'}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span className={`text-[15px] font-medium ${dark ? 'text-on-brand' : 'text-ink'}`}>
        {left > 0 ? `${left}s` : 'Done. Swipe when ready.'}
      </span>
      {left > 0 && (
        <button onClick={() => setLeft(null)} className={`p-1.5 rounded-full ${dark ? 'text-on-brand-2' : 'text-ink-3 hover:text-ink'}`} aria-label="Reset timer">
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function CardFace({ card, position, total }) {
  const Icon = KIND_ICONS[card.kind] || Sparkles;
  const dark = card.kind === 'yours';
  return (
    <div className={`h-full rounded-[28px] border p-7 sm:p-8 flex flex-col ${dark ? 'bg-brand border-brand text-on-brand' : 'bg-surface border-line'}`}>
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-2 eyebrow ${dark ? '!text-on-brand-2' : ''}`}>
          <Icon className="w-4 h-4" />
          {CARD_KINDS[card.kind]?.label}
        </span>
        <span className={`text-[12px] tabular-nums ${dark ? 'text-on-brand-2' : 'text-ink-3'}`}>{position} / {total}</span>
      </div>
      <div className="flex-1 flex flex-col justify-center py-6">
        <h3 className={`font-display text-[30px] sm:text-[34px] leading-[1.1] ${dark ? 'text-on-brand' : 'text-ink'}`}>
          {card.kind === 'yours' ? <span className="italic">{card.title}</span> : card.title}
        </h3>
        <p className={`mt-4 leading-relaxed ${card.kind === 'yours' ? 'font-display text-[22px] leading-snug' : 'text-[17px]'} ${dark ? 'text-on-brand' : 'text-ink-2'}`}>
          {card.body}
        </p>
        {card.sub && <p className={`mt-3 text-[14px] ${dark ? 'text-on-brand-2' : 'text-ink-3'}`}>{card.sub}</p>}
      </div>
      <div className="min-h-[44px] flex items-center">
        {card.seconds ? <CardTimer key={card.id} seconds={card.seconds} dark={dark} /> : null}
      </div>
    </div>
  );
}

// Swipe right = this helped, left = skip. Buttons and arrow keys do the same.
export default function SwipeDeck({ cards, index, onSwipe }) {
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [exit, setExit] = useState(null);
  const start = useRef(null);
  const top = cards[index];

  const commit = (dir) => {
    if (exit || !top) return;
    setExit(dir);
    navigator.vibrate?.(8);
    setTimeout(() => {
      onSwipe(dir, top);
      setExit(null);
      setDrag({ x: 0, y: 0, active: false });
    }, 240);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') commit('right');
      if (e.key === 'ArrowLeft') commit('left');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onPointerDown = (e) => {
    if (e.target.closest('button') || exit) return;
    start.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0, active: true });
  };
  const onPointerMove = (e) => {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: (e.clientY - start.current.y) * 0.25, active: true });
  };
  const onPointerUp = (e) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const velocity = Math.abs(dx) / Math.max(1, performance.now() - start.current.t);
    start.current = null;
    if (Math.abs(dx) > SWIPE_DISTANCE || (velocity > SWIPE_VELOCITY && Math.abs(dx) > 30)) {
      commit(dx > 0 ? 'right' : 'left');
    } else {
      setDrag({ x: 0, y: 0, active: false });
    }
  };

  const x = exit ? (exit === 'right' ? 1 : -1) * (typeof window !== 'undefined' ? window.innerWidth : 800) : drag.x;
  const rotate = exit ? (exit === 'right' ? 18 : -18) : drag.x / 18;
  const helpedOpacity = Math.max(0, Math.min(1, (exit === 'right' ? 140 : drag.x) / SWIPE_DISTANCE));
  const skipOpacity = Math.max(0, Math.min(1, (exit === 'left' ? 140 : -drag.x) / SWIPE_DISTANCE));

  return (
    <div className="select-none">
      <div className="relative h-[460px] sm:h-[480px] max-w-md mx-auto">
        {/* One keyed list for the visible stack, so the next card slides up into place instead of remounting */}
        {cards.slice(index, index + 3).map((card, depth) => {
          const isTop = depth === 0;
          const lift = exit ? Math.max(0, depth - 1) : depth;
          const style = isTop
            ? {
                transform: `translate(${x}px, ${exit ? 0 : drag.y}px) rotate(${rotate}deg)`,
                transition: drag.active && !exit ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.7, 0.2, 1)',
                touchAction: 'pan-y',
                zIndex: 3
              }
            : {
                transform: `translateY(${lift * 14}px) scale(${1 - lift * 0.045})`,
                transition: 'transform 0.28s cubic-bezier(0.2, 0.7, 0.2, 1)',
                zIndex: 3 - depth
              };
          return (
            <div
              key={`card-${index + depth}`}
              className={`absolute inset-0 ${isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
              style={style}
              {...(isTop
                ? {
                    role: 'group',
                    'aria-roledescription': 'card',
                    'aria-label': `${card.title}. Swipe right if it helped, left to skip.`,
                    onPointerDown,
                    onPointerMove,
                    onPointerUp,
                    onPointerCancel: onPointerUp
                  }
                : { 'aria-hidden': true })}
            >
              <div className={`h-full rounded-[28px] relative ${isTop ? 'shadow-lift' : 'shadow-card'}`}>
                {/* Cards further back show only their surface, so text never stacks visibly */}
                <div className={`h-full transition-opacity duration-200 ${isTop || (exit && depth === 1) ? 'opacity-100' : 'opacity-0'}`}>
                  <CardFace card={card} position={index + depth + 1} total={cards.length} />
                </div>
                {!isTop && !(exit && depth === 1) && (
                  <div className={`absolute inset-0 rounded-[28px] border ${card.kind === 'yours' ? 'bg-brand border-brand' : 'bg-surface border-line'}`} />
                )}
                {isTop && (
                  <>
                    <span
                      className="absolute top-6 left-6 rotate-[-10deg] border-2 border-cat-1 text-cat-1 bg-surface rounded-xl px-3 py-1 font-semibold text-[15px] pointer-events-none"
                      style={{ opacity: helpedOpacity }}
                    >
                      Helped
                    </span>
                    <span
                      className="absolute top-6 right-6 rotate-[10deg] border-2 border-line-strong text-ink-3 bg-surface rounded-xl px-3 py-1 font-semibold text-[15px] pointer-events-none"
                      style={{ opacity: skipOpacity }}
                    >
                      Skip
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-6 mt-8">
        <button
          onClick={() => commit('left')}
          className="w-14 h-14 rounded-full bg-surface border border-line-strong flex items-center justify-center text-ink-2 hover:text-ink shadow-card active:scale-95 transition-all"
          aria-label="Skip this card"
        >
          <X className="w-6 h-6" />
        </button>
        <span className="text-[12px] text-ink-3 w-28 text-center leading-tight">Swipe or tap<br />← skip · helped →</span>
        <button
          onClick={() => commit('right')}
          className="w-14 h-14 rounded-full bg-brand text-on-brand flex items-center justify-center shadow-lift active:scale-95 transition-all hover:bg-brand-hover"
          aria-label="This helped"
        >
          <Check className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
