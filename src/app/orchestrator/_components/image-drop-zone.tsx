'use client';

import { useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ImageDropZoneProps {
  /** Current preview (data URL or null) */
  preview: string | null;
  /** Called when user selects/drops a file */
  onFile: (file: File) => void;
  /** Called when user removes the image */
  onRemove: () => void;
  className?: string;
  compact?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageDropZone({
  preview,
  onFile,
  onRemove,
  className,
  compact = false,
}: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Only JPEG, PNG, WebP, GIF');
        return;
      }
      if (file.size > MAX_SIZE) {
        setError('Max 5MB');
        return;
      }
      onFile(file);
    },
    [onFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so same file can be re-selected
      e.target.value = '';
    },
    [handleFile],
  );

  if (preview) {
    return (
      <div className={cn('relative group', className)}>
        <img
          src={preview}
          alt=""
          className={cn(
            'object-cover rounded border',
            compact ? 'h-9 w-9' : 'h-20 w-20',
          )}
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove image"
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        'flex items-center justify-center rounded border-2 border-dashed cursor-pointer transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-primary/50',
        compact ? 'h-9 w-9' : 'h-20 w-20',
        className,
      )}
      title="Drop image or click to select"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />
      <span className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-lg')}>
        +
      </span>
      {error && !compact && (
        <span className="absolute text-[10px] text-destructive mt-1">{error}</span>
      )}
    </div>
  );
}
