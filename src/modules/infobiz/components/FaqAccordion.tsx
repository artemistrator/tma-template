'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  props?: {
    title?: string;
    items?: FaqItem[];
  };
}

/**
 * FaqAccordion — expandable FAQ list. One item open at a time.
 *
 * Config example:
 * {
 *   title: "Frequently asked questions",
 *   items: [
 *     { question: "Do I get lifetime access?", answer: "Yes! Once you purchase you have access forever, including all future updates." },
 *     { question: "What if I'm not satisfied?", answer: "We offer a 7-day no-questions-asked refund." }
 *   ]
 * }
 */
export function FaqAccordion({ id, className, props = {} }: FaqAccordionProps) {
  const { title, items = [] } = props;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div id={id} className={cn('px-4 py-5 space-y-3', className)}>
      {title && <h2 className="text-xl font-bold">{title}</h2>}
      <div className="rounded-xl border bg-card overflow-hidden divide-y">
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i}>
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between px-4 py-4 text-left gap-3"
              >
                <span className="font-medium text-sm leading-snug flex-1">{item.question}</span>
                <svg
                  className={cn('w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isOpen && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
