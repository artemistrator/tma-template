import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { getAdminClient, DIRECTUS_URL } from '@/lib/orchestrator/admin-client';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const UploadSchema = z.object({
  // Either url OR base64 must be provided
  url: z.string().url().optional(),
  base64: z.string().optional(),
  filename: z.string().min(1).max(255),
}).refine(
  data => data.url || data.base64,
  { message: 'Either "url" or "base64" must be provided' },
);

/**
 * POST /api/orchestrator/upload
 * Upload a single image to Directus Assets.
 * Accepts either a URL (Directus imports it) or base64 data.
 * Returns the Directus asset UUID and a proxy URL.
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const validation = UploadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { url, base64, filename } = validation.data;
    const client = await getAdminClient();

    let assetId: string;

    if (url) {
      // Use Directus import-from-URL
      const result = await client.request(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).importFile ? (globalThis as any).importFile(url, { title: filename }) : importFileViaRest(url, filename),
      );
      assetId = String((result as Record<string, unknown>).id);
    } else if (base64) {
      // Decode base64 and upload as FormData
      const match = base64.match(/^data:(.+?);base64,(.+)$/);
      const mimeType = match?.[1] || 'image/jpeg';
      const raw = match?.[2] || base64;

      const buffer = Buffer.from(raw, 'base64');
      if (buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
          { status: 413 },
        );
      }

      // Validate MIME type
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf'];
      if (!allowedMimes.includes(mimeType)) {
        return NextResponse.json(
          { success: false, error: `MIME type "${mimeType}" is not allowed` },
          { status: 400 },
        );
      }

      // Upload via Directus REST API directly (FormData)
      const formData = new FormData();
      const blob = new Blob([buffer], { type: mimeType });
      formData.append('file', blob, filename);
      formData.append('title', filename);

      // Get admin token for direct upload
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const token = (client as any)._token || (client as any).token;

      const uploadRes = await fetch(`${DIRECTUS_URL}/files`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.text();
        throw new Error(`Directus upload failed (${uploadRes.status}): ${errBody}`);
      }

      const uploadData = await uploadRes.json();
      assetId = String(uploadData.data?.id);
    } else {
      return NextResponse.json(
        { success: false, error: 'Either url or base64 must be provided' },
        { status: 400 },
      );
    }

    console.log(`[Orchestrator] Uploaded asset: ${assetId} (${filename})`);

    return NextResponse.json({
      success: true,
      assetId,
      publicUrl: `/api/assets/${assetId}`,
      filename,
    });
  } catch (error) {
    console.error('[Orchestrator] Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * Import a file from URL via Directus REST API.
 * Fallback when the SDK importFile helper is unavailable.
 */
async function importFileViaRest(url: string, filename: string) {
  // This returns a custom request object for the Directus SDK
  return {
    method: 'POST' as const,
    path: '/files/import',
    body: JSON.stringify({ url, data: { title: filename } }),
    headers: { 'Content-Type': 'application/json' },
  };
}
