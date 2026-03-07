'use client';

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { Search, X } from 'lucide-react';
import { useProductStore } from '@/store/product-store';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  className?: string;
  value?: string;
  defaultValue?: string;
}

/**
 * SearchBar - Product search component
 * Supports debounced search and clear functionality
 */
export function SearchBar({
  placeholder = 'Search products...',
  onSearch,
  onClear,
  className,
  value: controlledValue,
  defaultValue = '',
}: SearchBarProps) {
  const [value, setValue] = useState(controlledValue || defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  const { hapticFeedback } = useTelegramContext();
  const setSearchQuery = useProductStore((state) => state.setSearchQuery);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    setSearchQuery(newValue);
    onSearch?.(newValue);
  }, [onSearch, setSearchQuery]);

  const handleClear = useCallback(() => {
    hapticFeedback.impact('light');
    setValue('');
    setSearchQuery('');
    onClear?.();
    onSearch?.('');
  }, [hapticFeedback, onClear, onSearch, setSearchQuery]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const hasValue = value.length > 0;

  return (
    <div className={cn("relative", className)}>
      <div className={cn(
        "flex items-center gap-2 bg-muted/50 rounded-lg border transition-all",
        isFocused && "border-primary ring-2 ring-primary/20",
        hasValue && "bg-background"
      )}>
        <Search className="w-5 h-5 ml-3 text-muted-foreground" />
        <Input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 py-2 h-auto"
        />
        {hasValue && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mr-2 shrink-0"
            onClick={handleClear}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
