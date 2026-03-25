'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NICHE_TEMPLATES, type NicheTemplate } from './niche-templates';
import type { AppType } from './brief-form';

interface TemplateSelectorProps {
  appType: AppType | null;
  onSelect: (template: NicheTemplate) => void;
}

export function TemplateSelector({ appType, onSelect }: TemplateSelectorProps) {
  const [expanded, setExpanded] = useState(false);

  const filtered = appType
    ? NICHE_TEMPLATES.filter((t) => t.appType === appType)
    : NICHE_TEMPLATES;

  if (filtered.length === 0) return null;

  const shown = expanded ? filtered : filtered.slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Quick start — pick a template
        </h3>
        {filtered.length > 4 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show less' : `Show all ${filtered.length}`}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {shown.map((tmpl) => (
          <Card
            key={tmpl.id}
            className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
            onClick={() => onSelect(tmpl)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: tmpl.primaryColor }}
                />
                <span className="text-sm font-medium truncate">{tmpl.title}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {tmpl.description}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {tmpl.items.length} items &middot; {tmpl.locale.toUpperCase()} &middot; {tmpl.currency}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
