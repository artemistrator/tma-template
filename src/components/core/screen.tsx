'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ScreenProps {
  children: React.ReactNode;
  className?: string;
  withHeader?: boolean;
  headerTitle?: string;
  withPadding?: boolean;
}

/**
 * Screen - Base layout wrapper component
 * Provides consistent layout structure with optional header and padding
 */
export function Screen({
  children,
  className,
  withHeader = false,
  headerTitle,
  withPadding = true,
}: ScreenProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {withHeader && headerTitle && (
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container mx-auto px-4 py-3">
            <h1 className="text-xl font-semibold">{headerTitle}</h1>
          </div>
        </header>
      )}
      
      <main className={cn(withPadding && "container mx-auto px-4 py-6")}>
        {children}
      </main>
    </div>
  );
}
