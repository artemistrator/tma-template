import { NextRequest, NextResponse } from 'next/server';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { validateMiniAppSchema } from '@/lib/schema/mini-app-schema';
import fs from 'fs/promises';
import path from 'path';

const DIRECT_CONFIGS_DIR = path.join(process.cwd(), '.data', 'direct-configs');
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * POST /api/config/direct
 *
 * Accept a full MiniAppSchemaType JSON and persist it by slug.
 * This allows the orchestrator to bypass Directus entirely for prototyping/demo.
 *
 * GET /api/config?tenant=slug will check direct configs first.
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    // Validate against MiniAppSchemaType
    const validation = validateMiniAppSchema(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Schema validation failed', details: validation.error?.issues },
        { status: 400 },
      );
    }

    const config = validation.data;
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Config is empty after validation' },
        { status: 400 },
      );
    }

    const slug = config.meta.slug;
    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'meta.slug is required' },
        { status: 400 },
      );
    }

    // Ensure directory exists
    await fs.mkdir(DIRECT_CONFIGS_DIR, { recursive: true });

    // Write config to file with metadata
    const payload = {
      config,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + TTL_MS).toISOString(),
    };

    const filePath = path.join(DIRECT_CONFIGS_DIR, `${slug}.json`);
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');

    console.log(`[Direct Config] Saved config for slug "${slug}"`);

    return NextResponse.json({
      success: true,
      slug,
      expiresAt: payload.expiresAt,
      message: `Direct config saved for "${slug}" (TTL: 30 days)`,
    });
  } catch (error) {
    console.error('[Direct Config] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save direct config', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/config/direct?slug=xxx
 * Remove a direct config.
 */
export async function DELETE(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json(
      { success: false, error: 'slug query param is required' },
      { status: 400 },
    );
  }

  try {
    const filePath = path.join(DIRECT_CONFIGS_DIR, `${slug}.json`);
    await fs.unlink(filePath);
    console.log(`[Direct Config] Deleted config for slug "${slug}"`);
    return NextResponse.json({ success: true, slug, message: `Direct config deleted` });
  } catch {
    return NextResponse.json(
      { success: false, error: `No direct config found for "${slug}"` },
      { status: 404 },
    );
  }
}
