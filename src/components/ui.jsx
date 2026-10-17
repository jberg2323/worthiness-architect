import React, { useEffect } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

// The mark: an arch held up by its keystone. Worth is the stone that holds the structure, not decoration on top.
export function LogoMark({ className = 'w-8 h-8', archClass = 'stroke-brand', keystoneClass = 'fill-keystone' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M7 27V16A9 9 0 0 1 13.5 7.35" fill="none" strokeWidth="3" strokeLinecap="round" className={archClass} />
      <path d="M18.5 7.35A9 9 0 0 1 25 16V27" fill="none" strokeWidth="3" strokeLinecap="round" className={archClass} />
      <path d="M12.6 3.8H19.4L18 10.8H14Z" className={keystoneClass} />
    </svg>
  );
}

export function Wordmark({ compact = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="w-8 h-8 shrink-0" />
      <span className="leading-none">
        <span className="font-display text-[19px] font-medium text-ink tracking-tight">
          Worthiness <span className="italic font-normal">Architect</span>
        </span>
        {!compact && <span className="block eyebrow mt-1 !tracking-[0.18em] !text-[9.5px]">Foundations, not facades</span>}
      </span>
    </span>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover shadow-sm',
  secondary: 'bg-surface text-ink border border-line-strong hover:border-ink-3',
  soft: 'bg-brand-soft text-brand-ink hover:brightness-95',
  ghost: 'text-ink-2 hover:text-ink hover:bg-sunken',
  danger: 'bg-danger text-surface hover:brightness-110',
  'danger-outline': 'text-danger border border-danger hover:bg-danger-soft'
};

const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-xl'
};

export function Button({ variant = 'primary', size = 'md', className = '', icon: Icon, iconRight: IconRight, children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />}
      {children}
      {IconRight && <IconRight className="w-4 h-4 shrink-0" strokeWidth={2} />}
    </button>
  );
}

export function Card({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={`bg-surface border border-line rounded-card shadow-card ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function SectionHeading({ eyebrow, title, children, className = '' }) {
  return (
    <div className={className}>
      {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
      <h2 className="font-display text-[28px] sm:text-[34px] leading-[1.1] text-ink">{title}</h2>
      {children && <p className="text-[15px] text-ink-2 leading-relaxed mt-3 max-w-2xl">{children}</p>}
    </div>
  );
}

export function Pill({ className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full ${className}`}>
      {children}
    </span>
  );
}

export function CategoryTag({ category }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-2">
      <span className={`w-2 h-2 rounded-full ${category.dot}`} />
      {category.label}
    </span>
  );
}

export function FieldLabel({ htmlFor, children, hint }) {
  return (
    <label htmlFor={htmlFor} className="block mb-2">
      <span className="text-[13px] font-semibold text-ink">{children}</span>
      {hint && <span className="text-[13px] text-ink-3 ml-1.5">{hint}</span>}
    </label>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="text-center py-14 px-6 border border-dashed border-line-strong rounded-card">
      {Icon && (
        <div className="w-11 h-11 rounded-full bg-sunken flex items-center justify-center mx-auto mb-4">
          <Icon className="w-5 h-5 text-ink-3" />
        </div>
      )}
      <h3 className="font-display text-xl text-ink">{title}</h3>
      {children && <p className="text-sm text-ink-2 max-w-sm mx-auto mt-2 leading-relaxed">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Centered dialog on desktop, bottom sheet on phones
export function Modal({ title, eyebrow, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_45%,transparent)] backdrop-blur-[2px] animate-rise" onClick={onClose} style={{ animationDuration: '0.2s' }} />
      <div
        className={`relative bg-surface w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} rounded-t-[28px] sm:rounded-[28px] shadow-lift max-h-[92vh] overflow-y-auto animate-rise`}
      >
        <div className="sticky top-0 bg-surface z-10 px-6 sm:px-8 pt-6 pb-4 flex items-start justify-between gap-4">
          <div>
            {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
            <h3 className="font-display text-2xl text-ink leading-tight">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-sunken transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 sm:px-8 pb-8">{children}</div>
      </div>
    </div>
  );
}

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed z-[60] inset-x-4 bottom-24 md:bottom-8 flex justify-center pointer-events-none animate-rise" role="status">
      <div className="flex items-center gap-2.5 bg-ink text-bg pl-4 pr-5 py-3 rounded-full shadow-lift text-sm font-medium max-w-full">
        <CheckCircle2 className="w-4 h-4 text-keystone shrink-0" />
        {message}
      </div>
    </div>
  );
}
