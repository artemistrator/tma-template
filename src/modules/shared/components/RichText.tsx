'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface RichTextProps {
  id?: string;
  className?: string;
  onNavigate?: (pageId: string) => void;
  props?: {
    content?: string;     // Plain text with \n, basic markdown (# ## **bold**)
    align?: 'left' | 'center' | 'right';
    size?: 'sm' | 'md' | 'lg';
    muted?: boolean;      // Use muted-foreground color
  };
}

/**
 * RichText — simple content block.
 * Parses basic markdown: # headings, **bold**, *italic*, \n line breaks.
 *
 * Config example:
 * {
 *   content: "# About us\n\nWe make the **best pizza** in the city.\nOrder now and taste the difference."
 * }
 */
export function RichText({ id, className, props = {} }: RichTextProps) {
  const { content = '', align = 'left', size = 'md', muted = false } = props;

  if (!content) return null;

  const sizeClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  const colorClass = muted ? 'text-muted-foreground' : '';

  const lines = content.split('\n');

  const renderLine = (line: string, i: number) => {
    if (line.startsWith('# ')) {
      return <h2 key={i} className="text-xl font-bold mt-2 mb-1">{line.slice(2)}</h2>;
    }
    if (line.startsWith('## ')) {
      return <h3 key={i} className="text-lg font-semibold mt-2 mb-1">{line.slice(3)}</h3>;
    }
    if (line.startsWith('### ')) {
      return <h4 key={i} className="text-base font-semibold mt-1.5 mb-0.5">{line.slice(4)}</h4>;
    }
    if (line.trim() === '') {
      return <div key={i} className="h-2" />;
    }

    // Inline bold and italic
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={j}>{part.slice(1, -1)}</em>;
      }
      return part;
    });

    return <p key={i} className="leading-relaxed">{rendered}</p>;
  };

  return (
    <div
      id={id}
      className={cn('px-4 py-4 space-y-0.5', sizeClass, alignClass, colorClass, className)}
    >
      {lines.map((line, i) => renderLine(line, i))}
    </div>
  );
}
