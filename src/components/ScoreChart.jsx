import React, { useState } from 'react';
import { formatDate } from '../lib/format.js';

// Single-series line of self-esteem scores over time (0–30), with hover/focus tooltips
export default function ScoreChart({ points }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const W = 960, H = 300, L = 32, R = 24, T = 28, B = 32;
  const t0 = points[0].createdAt;
  const t1 = points[points.length - 1].createdAt;
  const x = (t) => (t1 === t0 ? L + (W - L - R) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - R));
  const y = (s) => T + (1 - s / 30) * (H - T - B);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.createdAt)},${y(p.score)}`).join(' ');
  const area = points.length > 1
    ? `${path} L${x(t1)},${y(0)} L${x(t0)},${y(0)} Z`
    : null;
  const last = points[points.length - 1];
  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label={`Self-esteem scores over time, latest ${last.score} out of 30`}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="scoreFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x={L} y={y(25)} width={W - L - R} height={y(15) - y(25)} fill="var(--sunken)" rx="6" />
        <text x={L + 10} y={y(25) + 16} fontSize="11" fill="var(--ink-3)">Typical range</text>
        {[0, 10, 20, 30].map(v => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
            <text x={L - 10} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">{v}</text>
          </g>
        ))}
        <text x={L} y={H - 8} fontSize="11" fill="var(--ink-3)">{formatDate(t0)}</text>
        {t1 !== t0 && <text x={W - R} y={H - 8} textAnchor="end" fontSize="11" fill="var(--ink-3)">{formatDate(t1)}</text>}
        {area && <path d={area} fill="url(#scoreFill)" />}
        {hovered && (
          <line x1={x(hovered.createdAt)} x2={x(hovered.createdAt)} y1={T} y2={H - B} stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="3 3" />
        )}
        {points.length > 1 && (
          <path d={path} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        )}
        {points.map((p, i) => (
          <circle key={p.id} cx={x(p.createdAt)} cy={y(p.score)} r={hoverIdx === i ? 6 : 4.5} fill="var(--brand)" stroke="var(--surface)" strokeWidth="2" />
        ))}
        <text
          x={x(last.createdAt)}
          y={y(last.score) - 14}
          textAnchor={points.length > 1 ? 'end' : 'middle'}
          fontSize="13"
          fontWeight="600"
          fill="var(--ink)"
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
            aria-label={`${formatDate(p.createdAt)}: ${p.score} out of 30`}
            onMouseEnter={() => setHoverIdx(i)}
            onFocus={() => setHoverIdx(i)}
            onBlur={() => setHoverIdx(null)}
          />
        ))}
      </svg>
      {hovered && (
        <div
          className="absolute pointer-events-none bg-ink text-bg text-[12px] rounded-lg px-2.5 py-1.5 shadow-lift whitespace-nowrap"
          style={{
            left: `${(x(hovered.createdAt) / W) * 100}%`,
            top: `${(y(hovered.score) / H) * 100}%`,
            transform: 'translate(-50%, calc(-100% - 14px))'
          }}
        >
          <span className="font-semibold">{hovered.score}/30</span> · {formatDate(hovered.createdAt)}
        </div>
      )}
    </div>
  );
}
