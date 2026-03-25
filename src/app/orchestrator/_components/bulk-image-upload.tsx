'use client';

import { useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface BulkImageUploadProps {
  /** Item names to match against filenames */
  itemNames: string[];
  /** Called with mapping: itemIndex → File */
  onMatch: (matches: Record<number, File>) => void;
}

/**
 * Drop zone for multiple images at once.
 * Tries to auto-map files to items by fuzzy filename matching.
 */
export function BulkImageUpload({ itemNames, onMatch }: BulkImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (files: FileList) => {
      const validFiles = Array.from(files).filter((f) =>
        ALLOWED_TYPES.includes(f.type),
      );
      if (validFiles.length === 0) return;

      const matches: Record<number, File> = {};
      let matched = 0;

      for (const file of validFiles) {
        // Strip extension and normalize
        const baseName = file.name
          .replace(/\.[^.]+$/, '')
          .toLowerCase()
          .replace(/[_-]+/g, ' ')
          .trim();

        // Try to find best matching item
        let bestIdx = -1;
        let bestScore = 0;

        for (let i = 0; i < itemNames.length; i++) {
          if (matches[i]) continue; // already matched
          const itemNorm = itemNames[i].toLowerCase().trim();
          if (!itemNorm) continue;

          // Exact match
          if (baseName === itemNorm) {
            bestIdx = i;
            bestScore = 100;
            break;
          }

          // Contains match
          if (baseName.includes(itemNorm) || itemNorm.includes(baseName)) {
            const score = Math.min(baseName.length, itemNorm.length) /
              Math.max(baseName.length, itemNorm.length) * 80;
            if (score > bestScore) {
              bestScore = score;
              bestIdx = i;
            }
          }

          // First word match
          const fileWords = baseName.split(/\s+/);
          const itemWords = itemNorm.split(/\s+/);
          if (fileWords[0] && itemWords[0] && fileWords[0] === itemWords[0]) {
            const score = 50;
            if (score > bestScore) {
              bestScore = score;
              bestIdx = i;
            }
          }
        }

        if (bestIdx >= 0 && bestScore >= 30) {
          matches[bestIdx] = file;
          matched++;
        }
      }

      // If no matches found, assign sequentially
      if (matched === 0) {
        for (let i = 0; i < Math.min(validFiles.length, itemNames.length); i++) {
          matches[i] = validFiles[i];
          matched++;
        }
      }

      onMatch(matches);
      setLastResult(
        `${matched} of ${validFiles.length} images mapped to items`,
      );
    },
    [itemNames, onMatch],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      e.target.value = '';
    },
    [processFiles],
  );

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
        )}
        onClick={() => inputRef.current?.click()}
      >
        <p className="text-sm font-medium">Drop images here or click to select</p>
        <p className="text-xs text-muted-foreground">
          Files are auto-matched to items by filename. JPEG, PNG, WebP, GIF.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
      {lastResult && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{lastResult}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLastResult(null)}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
