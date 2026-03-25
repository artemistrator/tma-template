'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AiPromptFormProps {
  onSubmit: (prompt: string) => void;
  isDisabled?: boolean;
}

const EXAMPLES = [
  {
    label: 'Пиццерия',
    prompt: 'Пиццерия "Марио" в Москве. Русский язык, рубли. 8 позиций пиццы + 3 напитка. Цвет — красный.',
  },
  {
    label: 'Barbershop',
    prompt: 'Barbershop "Sharp Edge". English, USD. 5 services (haircut, beard, combo, coloring, styling). 2 barbers. Working hours Mon-Sat 10-21.',
  },
  {
    label: 'Онлайн-школа',
    prompt: 'Онлайн-школа "Digital Pro" — курсы по маркетингу. Русский, рубли. 3 курса, 1 PDF-гайд, 1 консультация. Автор: Артём Иванов.',
  },
];

export function AiPromptForm({ onSubmit, isDisabled }: AiPromptFormProps) {
  const [prompt, setPrompt] = useState('');

  function handleSubmit() {
    if (prompt.trim().length < 10) {
      alert('Опишите бизнес подробнее (минимум 10 символов)');
      return;
    }
    onSubmit(prompt.trim());
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="text-lg">✨</span>
          AI Mode — опишите бизнес текстом
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Опишите ваш бизнес: что продаёте, какие товары/услуги, язык, валюта, стиль..."
          className="w-full h-32 px-3 py-2 border border-input rounded-md bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={isDisabled}
        />

        {/* Example prompts */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">Примеры:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => setPrompt(ex.prompt)}
              className="text-xs px-2.5 py-1 rounded-full border border-input hover:bg-accent transition-colors"
              disabled={isDisabled}
            >
              {ex.label}
            </button>
          ))}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isDisabled || prompt.trim().length < 10}
          className="w-full"
          size="lg"
        >
          ✨ Generate App with AI
        </Button>

        <p className="text-xs text-muted-foreground">
          AI определит тип приложения, сгенерирует товары/услуги, маркетинговый контент
          и соберёт полноценный Mini App автоматически.
        </p>
      </CardContent>
    </Card>
  );
}
