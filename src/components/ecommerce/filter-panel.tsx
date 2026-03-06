'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

export interface FilterPanelProps {
  categories?: FilterOption[];
  priceRange?: { min: number; max: number };
  selectedCategories?: string[];
  selectedPriceRange?: [number, number];
  onApplyFilters?: (filters: { categories: string[]; priceRange: [number, number] }) => void;
  onClearFilters?: () => void;
  className?: string;
}

/**
 * FilterPanel - Product filtering component
 * Supports category and price range filters
 */
export function FilterPanel({
  categories = [],
  priceRange = { min: 0, max: 1000 },
  selectedCategories = [],
  selectedPriceRange,
  onApplyFilters,
  onClearFilters,
  className,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localCategories, setLocalCategories] = useState<string[]>(selectedCategories);
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>(
    selectedPriceRange || [priceRange.min, priceRange.max]
  );
  
  const { hapticFeedback } = useTelegramContext();

  const toggleCategory = (categoryId: string) => {
    hapticFeedback.impact('light');
    setLocalCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleApplyFilters = () => {
    hapticFeedback.impact('medium');
    setIsExpanded(false);
    onApplyFilters?.({
      categories: localCategories,
      priceRange: localPriceRange,
    });
  };

  const handleClearFilters = () => {
    hapticFeedback.impact('light');
    setLocalCategories([]);
    setLocalPriceRange([priceRange.min, priceRange.max]);
    onClearFilters?.();
  };

  const hasActiveFilters = localCategories.length > 0 || 
    (localPriceRange[0] !== priceRange.min || localPriceRange[1] !== priceRange.max);

  const formatPrice = (value: number) => `$${value.toFixed(0)}`;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            hapticFeedback.impact('light');
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center gap-2 font-medium"
        >
          <Filter className="w-5 h-5" />
          <span>Filters</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <Card>
          <CardContent className="p-4 space-y-6">
            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Badge
                      key={category.id}
                      variant={localCategories.includes(category.id) ? 'default' : 'outline'}
                      className="cursor-pointer transition-all"
                      onClick={() => toggleCategory(category.id)}
                    >
                      {category.label}
                      {category.count !== undefined && (
                        <span className="ml-1 opacity-60">({category.count})</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Price Range */}
            <div>
              <h4 className="font-medium mb-3">
                Price Range: {formatPrice(localPriceRange[0])} - {formatPrice(localPriceRange[1])}
              </h4>
              <Slider
                value={localPriceRange}
                min={priceRange.min}
                max={priceRange.max}
                step={10}
                onValueChange={(value) => setLocalPriceRange(value as [number, number])}
                className="mt-2"
              />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>{formatPrice(priceRange.min)}</span>
                <span>{formatPrice(priceRange.max)}</span>
              </div>
            </div>

            {/* Apply Button */}
            <Button className="w-full" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && !isExpanded && (
        <div className="flex flex-wrap gap-2">
          {localCategories.map((categoryId) => {
            const category = categories.find((c) => c.id === categoryId);
            return (
              <Badge key={categoryId} variant="secondary" className="gap-1">
                {category?.label || categoryId}
                <button
                  onClick={() => toggleCategory(categoryId)}
                  className="ml-1 hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
          {(localPriceRange[0] !== priceRange.min || localPriceRange[1] !== priceRange.max) && (
            <Badge variant="secondary" className="gap-1">
              {formatPrice(localPriceRange[0])} - {formatPrice(localPriceRange[1])}
              <button
                onClick={() => setLocalPriceRange([priceRange.min, priceRange.max])}
                className="ml-1 hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
