import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';

const BatchUploadSchema = z.object({
  images: z.array(z.object({
    url: z.string().url().optional(),
    base64: z.string().optional(),
    filename: z.string().min(1).max(255),
  }).refine(
    data => data.url || data.base64,
    { message: 'Either "url" or "base64" must be provided for each image' },
  )).min(1).max(50),
});

/**
 * POST /api/orchestrator/upload/batch
 * Upload multiple images in one call.
 * Delegates each image to the single upload endpoint.
 * Returns a mapping of filename → assetId.
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = BatchUploadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { images } = validation.data;

    // Get the authorization header to forward to single upload endpoint
    const authHeader = request.headers.get('authorization') || '';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;

    // Process uploads concurrently (max 5 at a time)
    const CONCURRENCY = 5;
    const results: Array<{ filename: string; assetId?: string; publicUrl?: string; error?: string }> = [];

    for (let i = 0; i < images.length; i += CONCURRENCY) {
      const batch = images.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map(async (img) => {
          const res = await fetch(`${appUrl}/api/orchestrator/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
            },
            body: JSON.stringify(img),
          });

          const data = await res.json();
          if (data.success) {
            return { filename: img.filename, assetId: data.assetId, publicUrl: data.publicUrl };
          }
          return { filename: img.filename, error: data.error || 'Upload failed' };
        }),
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({ filename: 'unknown', error: result.reason?.message || 'Upload failed' });
        }
      }
    }

    const succeeded = results.filter(r => r.assetId);
    const failed = results.filter(r => r.error);

    // Build filename → assetId mapping
    const assets: Record<string, string> = {};
    for (const r of succeeded) {
      if (r.assetId) assets[r.filename] = r.assetId;
    }

    console.log(`[Orchestrator] Batch upload: ${succeeded.length} ok, ${failed.length} failed`);

    return NextResponse.json({
      success: failed.length === 0,
      total: images.length,
      uploaded: succeeded.length,
      failed: failed.length,
      assets,
      errors: failed.length > 0 ? failed : undefined,
    });
  } catch (error) {
    console.error('[Orchestrator] Batch upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Batch upload failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
