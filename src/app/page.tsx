'use client';

import { useEffect, useState } from 'react';
import { PageRenderer } from '@/lib/renderer/page-renderer';
import { MiniAppSchemaType, validateMiniAppSchema } from '@/lib/schema/mini-app-schema';
import { initializeComponents } from '@/components';
import demoConfig from '@/config/demo.json';

// Force dynamic rendering to avoid SSR issues with window object
export const dynamic = 'force-dynamic';

export default function Home() {
  const [schema, setSchema] = useState<MiniAppSchemaType | null>(null);
  const [currentPageId, setCurrentPageId] = useState('home');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Initialize components on mount
    setIsMounted(true);
    initializeComponents();
  }, []);

  useEffect(() => {
    // Validate and load schema
    const result = validateMiniAppSchema(demoConfig);
    if (result.success) {
      setSchema(result.data as MiniAppSchemaType);
    } else {
      console.error('Schema validation failed:', result.error);
    }
  }, []);

  const handleNavigate = (pageId: string) => {
    setCurrentPageId(pageId);
  };

  if (!isMounted || !schema) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentPage = schema.pages.find((p) => p.id === currentPageId) || schema.pages[0];

  return (
    <PageRenderer
      page={currentPage}
      dataContext={{}}
      onNavigate={handleNavigate}
    />
  );
}
