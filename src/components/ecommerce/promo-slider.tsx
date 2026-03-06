'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTelegramContext } from '@/lib/telegram/telegram-provider';

interface PromoSlide {
  id: string;
  title: string;
  description?: string;
  image?: string;
  backgroundColor?: string;
  action?: () => void;
  ctaText?: string;
}

interface PromoSliderProps {
  id?: string;
  slides?: PromoSlide[];
  autoPlay?: boolean;
  autoPlayInterval?: number;
  height?: 'sm' | 'md' | 'lg' | number;
  className?: string;
}

/**
 * PromoSlider - Carousel slider for promotional content
 * Supports auto-play and touch gestures
 */
export function PromoSlider({
  id,
  slides = [],
  autoPlay = true,
  autoPlayInterval = 5000,
  height = 'md',
  className,
}: PromoSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { hapticFeedback } = useTelegramContext();

  const heightValue = typeof height === 'number' ? height : { sm: 120, md: 180, lg: 240 }[height];
  const safeSlides = Array.isArray(slides) ? slides : [];

  const goToSlide = useCallback((index: number) => {
    if (safeSlides.length === 0) return;
    setCurrentIndex((prev) => {
      const newIndex = Math.max(0, Math.min(index, safeSlides.length - 1));
      if (newIndex !== prev) {
        hapticFeedback.selection();
      }
      return newIndex;
    });
  }, [safeSlides.length, hapticFeedback]);

  // Auto-play
  useEffect(() => {
    if (!autoPlay || safeSlides.length <= 1) return;
    const interval = setInterval(() => {
      goToSlide(currentIndex + 1);
    }, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, currentIndex, goToSlide, safeSlides.length]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    setTranslateX(currentX - startX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (Math.abs(translateX) > 50) {
      goToSlide(translateX > 0 ? currentIndex - 1 : currentIndex + 1);
    }
    setTranslateX(0);
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTranslateX(e.clientX - startX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (Math.abs(translateX) > 50) {
      goToSlide(translateX > 0 ? currentIndex - 1 : currentIndex + 1);
    }
    setTranslateX(0);
  };

  if (safeSlides.length === 0) return null;

  return (
    <div className={cn("relative", className)} id={id}>
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg"
        style={{ height: heightValue }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${translateX}px))`,
          }}
        >
          {safeSlides.map((slide) => (
            <div key={slide.id} className="min-w-full h-full">
              <Card className="h-full border-0 rounded-lg overflow-hidden">
                <CardContent className="p-0 h-full">
                  {slide.image ? (
                    <div
                      className="w-full h-full bg-cover bg-center relative"
                      style={{ backgroundImage: `url(${slide.image})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <h3 className="text-xl font-bold">{slide.title}</h3>
                        {slide.description && (
                          <p className="text-sm opacity-90 mt-1">{slide.description}</p>
                        )}
                        {slide.ctaText && slide.action && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="mt-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              slide.action?.();
                            }}
                          >
                            {slide.ctaText}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center p-4"
                      style={{ backgroundColor: slide.backgroundColor }}
                    >
                      <div className="text-center">
                        <h3 className="text-xl font-bold">{slide.title}</h3>
                        {slide.description && (
                          <p className="text-sm opacity-80 mt-1">{slide.description}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination dots */}
      {safeSlides.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {safeSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex
                  ? "bg-primary w-6"
                  : "bg-muted hover:bg-primary/50"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
