import React, { useEffect, useRef } from 'react';
import { ArrowUp, RotateCcw, BookmarkPlus } from 'lucide-react';
import { Button, LogoMark } from '../components/ui.jsx';
import { CrisisCard } from '../components/dialogs.jsx';
import { QUICK_STARTERS } from '../lib/content.js';

function AssistantMessage({ msg, onSave }) {
  return (
    <div className="flex gap-3.5 animate-rise">
      <div className="w-8 h-8 rounded-full bg-sunken flex items-center justify-center shrink-0 mt-0.5">
        <LogoMark className="w-[18px] h-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-[16px] leading-[1.7] whitespace-pre-wrap ${msg.kind === 'error' ? 'text-ink-3 italic' : 'text-ink'}`}>
          {msg.text}
        </div>
        {!msg.kind && (
          <button
            onClick={onSave}
            className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-brand transition-colors"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Save to evidence
          </button>
        )}
      </div>
    </div>
  );
}

export default function Reflect({ app }) {
  const { messages, chatInput, setChatInput, isChatLoading, sendMessage, resetChat } = app;
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const isFresh = messages.every(m => m.kind === 'welcome');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isChatLoading]);

  // Grow the composer with its content, up to ~6 lines
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [chatInput]);

  return (
    <div className="max-w-3xl mx-auto flex flex-col min-h-[calc(100dvh-220px)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="eyebrow mb-1.5">Reflect</div>
          <h1 className="font-display text-[30px] sm:text-[36px] leading-tight text-ink">Talk it through</h1>
        </div>
        {!isFresh && (
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={resetChat} disabled={isChatLoading}>New conversation</Button>
        )}
      </div>

      <div className="flex-1 space-y-8 pb-6" aria-live="polite">
        {messages.map(msg => {
          if (msg.kind === 'crisis') return <CrisisCard key={msg.id} />;
          if (msg.role === 'model') {
            return (
              <AssistantMessage
                key={msg.id}
                msg={msg}
                onSave={() =>
                  app.addEvidence({
                    title: 'An insight from Reflect',
                    reflection: msg.text.slice(0, 280) + (msg.text.length > 280 ? '…' : ''),
                    category: 'unhooked',
                    source: 'Reflect'
                  })
                }
              />
            );
          }
          return (
            <div key={msg.id} className="flex justify-end animate-rise">
              <div className="max-w-[85%] bg-brand-soft text-brand-ink rounded-[22px] rounded-br-md px-5 py-3.5 text-[16px] leading-relaxed whitespace-pre-wrap">
                {msg.text}
              </div>
            </div>
          );
        })}

        {isFresh && (
          <div className="grid sm:grid-cols-2 gap-2.5 sm:pl-12">
            {QUICK_STARTERS.map(starter => (
              <button
                key={starter.label}
                disabled={isChatLoading}
                onClick={() => sendMessage(starter.prompt)}
                className="text-left p-4 rounded-2xl border border-line bg-surface hover:border-line-strong hover:shadow-card transition-all disabled:opacity-50"
              >
                <span className="eyebrow block mb-1.5">{starter.tag}</span>
                <span className="text-[15px] text-ink leading-snug">{starter.label}</span>
              </button>
            ))}
          </div>
        )}

        {isChatLoading && (
          <div className="flex gap-3.5 items-center">
            <div className="w-8 h-8 rounded-full bg-sunken flex items-center justify-center shrink-0">
              <LogoMark className="w-[18px] h-[18px] animate-pulse" />
            </div>
            <span className="text-[15px] text-ink-3 italic font-display">Listening beneath the critic…</span>
          </div>
        )}
        <div ref={endRef} className="h-24 md:h-16" aria-hidden="true" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="sticky bottom-[84px] md:bottom-4 z-10"
      >
        <div className="flex items-end gap-2 bg-surface border border-line-strong rounded-[24px] shadow-lift p-2 pl-5 focus-within:border-brand transition-colors">
          <textarea
            ref={inputRef}
            rows={1}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="What happened, or what is the critic saying?"
            aria-label="Message"
            className="flex-1 resize-none bg-transparent py-2.5 text-[16px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isChatLoading}
            className="w-10 h-10 rounded-full bg-brand text-on-brand flex items-center justify-center shrink-0 transition-all hover:bg-brand-hover disabled:opacity-30"
            aria-label="Send"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
        <p className="hidden sm:block text-center text-[12px] text-ink-3 mt-2">Enter to send · Shift + Enter for a new line</p>
      </form>
    </div>
  );
}
