'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageDropZone } from './image-drop-zone';
import type { AppType } from './brief-form';

export interface ItemData {
  name: string;
  price: number;
  category?: string;
  description?: string;
  image?: string;
  stock_quantity?: number;
  duration?: number;
  type?: 'article' | 'pdf' | 'course' | 'consultation';
  slug?: string;
  content?: string;
  external_url?: string;
}

interface ItemsEditorProps {
  appType: AppType;
  items: ItemData[];
  onChange: (items: ItemData[]) => void;
  /** Map of item index → image preview data URL */
  imagePreviews: Record<number, string>;
  /** Called when a file is attached to an item */
  onImageAttach: (index: number, file: File) => void;
  /** Called when an image is removed from an item */
  onImageRemove: (index: number) => void;
}

function createEmptyItem(appType: AppType): ItemData {
  const base: ItemData = { name: '', price: 0 };
  if (appType === 'booking') base.duration = 60;
  if (appType === 'infobiz') {
    base.type = 'course';
    base.slug = '';
  }
  return base;
}

export function ItemsEditor({
  appType,
  items,
  onChange,
  imagePreviews,
  onImageAttach,
  onImageRemove,
}: ItemsEditorProps) {
  const [csvMode, setCsvMode] = useState(false);
  const [csvText, setCsvText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addItem = useCallback(() => {
    onChange([...items, createEmptyItem(appType)]);
  }, [items, onChange, appType]);

  const removeItem = useCallback(
    (index: number) => {
      onImageRemove(index);
      onChange(items.filter((_, i) => i !== index));
    },
    [items, onChange, onImageRemove],
  );

  const updateItem = useCallback(
    (index: number, field: keyof ItemData, value: string | number) => {
      const updated = [...items];
      updated[index] = { ...updated[index], [field]: value };
      onChange(updated);
    },
    [items, onChange],
  );

  const parseCsvText = useCallback(
    (text: string) => {
      const lines = text.trim().split('\n').filter(Boolean);
      if (lines.length === 0) return;

      const parsed: ItemData[] = [];
      const firstLine = lines[0];
      const sep = firstLine.includes('\t')
        ? '\t'
        : firstLine.includes(';')
          ? ';'
          : ',';

      // Skip header row if it looks like one
      const startIdx =
        firstLine.toLowerCase().includes('name') &&
        firstLine.toLowerCase().includes('price')
          ? 1
          : 0;

      for (let idx = startIdx; idx < lines.length; idx++) {
        const cols = lines[idx].split(sep).map((c) => c.trim());
        if (cols.length < 2) continue;

        const item: ItemData = {
          name: cols[0],
          price: parseFloat(cols[1]) || 0,
        };

        if (cols[2]) item.category = cols[2];
        if (cols[3]) item.description = cols[3];

        if (appType === 'booking' && cols[4]) {
          item.duration = parseInt(cols[4]) || 60;
        }
        if (appType === 'infobiz') {
          item.slug = item.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');
          item.type = 'course';
        }

        parsed.push(item);
      }

      if (parsed.length > 0) {
        onChange([...items, ...parsed]);
        setCsvText('');
        setCsvMode(false);
      }
    },
    [items, onChange, appType],
  );

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        parseCsvText(text);
      };
      reader.readAsText(file);

      // Reset input
      e.target.value = '';
    },
    [parseCsvText],
  );

  const label =
    appType === 'ecommerce'
      ? 'product'
      : appType === 'booking'
        ? 'service'
        : 'info product';

  return (
    <div className="space-y-3">
      {/* Actions bar */}
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          Import CSV file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          onChange={handleFileImport}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCsvMode(!csvMode)}
        >
          {csvMode ? 'Manual entry' : 'Paste CSV'}
        </Button>
      </div>

      {csvMode ? (
        <div className="space-y-2">
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`name${appType === 'booking' ? ', price, category, description, duration_min' : ', price, category, description'}\nPizza Margherita, 590, Pizza, Classic margherita${appType === 'booking' ? ', 60' : ''}\nPizza Pepperoni, 690, Pizza, Spicy pepperoni${appType === 'booking' ? ', 45' : ''}`}
            rows={6}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
          />
          <p className="text-xs text-muted-foreground">
            One item per line. Columns: name, price, category, description
            {appType === 'booking' && ', duration (minutes)'}. Header row is
            auto-skipped. Separators: comma, semicolon or tab.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => parseCsvText(csvText)}
          >
            Parse & Add
          </Button>
        </div>
      ) : (
        <>
          {items.map((item, i) => (
            <ItemRow
              key={i}
              item={item}
              index={i}
              appType={appType}
              onChange={updateItem}
              onRemove={removeItem}
              imagePreview={imagePreviews[i] || null}
              onImageAttach={onImageAttach}
              onImageRemove={onImageRemove}
            />
          ))}

          <Button type="button" variant="outline" onClick={addItem}>
            + Add {label}
          </Button>
        </>
      )}
    </div>
  );
}

function ItemRow({
  item,
  index,
  appType,
  onChange,
  onRemove,
  imagePreview,
  onImageAttach,
  onImageRemove,
}: {
  item: ItemData;
  index: number;
  appType: AppType;
  onChange: (index: number, field: keyof ItemData, value: string | number) => void;
  onRemove: (index: number) => void;
  imagePreview: string | null;
  onImageAttach: (index: number, file: File) => void;
  onImageRemove: (index: number) => void;
}) {
  return (
    <div className="flex gap-2 items-start p-3 rounded-lg border bg-muted/30">
      {/* Image */}
      <ImageDropZone
        preview={imagePreview}
        onFile={(file) => onImageAttach(index, file)}
        onRemove={() => onImageRemove(index)}
        compact
      />

      {/* Fields */}
      <div className="flex-1 flex flex-wrap gap-2">
        <div className="flex-1 min-w-[140px]">
          <Input
            value={item.name}
            onChange={(e) => onChange(index, 'name', e.target.value)}
            placeholder="Name *"
          />
        </div>
        <div className="w-24">
          <Input
            type="number"
            value={item.price || ''}
            onChange={(e) =>
              onChange(index, 'price', parseFloat(e.target.value) || 0)
            }
            placeholder="Price"
            min={0}
            step={0.01}
          />
        </div>
        <div className="w-28">
          <Input
            value={item.category || ''}
            onChange={(e) => onChange(index, 'category', e.target.value)}
            placeholder="Category"
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <Input
            value={item.description || ''}
            onChange={(e) => onChange(index, 'description', e.target.value)}
            placeholder="Description"
          />
        </div>

        {appType === 'booking' && (
          <div className="w-20">
            <Input
              type="number"
              value={item.duration || ''}
              onChange={(e) =>
                onChange(index, 'duration', parseInt(e.target.value) || 60)
              }
              placeholder="Min"
              min={5}
              title="Duration in minutes"
            />
          </div>
        )}

        {appType === 'infobiz' && (
          <>
            <div className="w-28">
              <select
                value={item.type || 'course'}
                onChange={(e) => onChange(index, 'type', e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="article">Article</option>
                <option value="pdf">PDF</option>
                <option value="course">Course</option>
                <option value="consultation">Consult</option>
              </select>
            </div>
            <div className="w-28">
              <Input
                value={item.slug || ''}
                onChange={(e) =>
                  onChange(
                    index,
                    'slug',
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, ''),
                  )
                }
                placeholder="url-slug"
              />
            </div>
          </>
        )}
      </div>

      {/* Remove button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(index)}
        className="text-destructive hover:text-destructive shrink-0"
        title="Remove"
      >
        &times;
      </Button>
    </div>
  );
}
