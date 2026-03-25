import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter({ limit: 20, windowMs: 3_600_000, prefix: 'screenshot' });

const ScreenshotSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  /** Viewport width (default: 390 — iPhone 14 width) */
  width: z.number().int().min(320).max(1920).default(390),
  /** Viewport height (default: 844 — iPhone 14 height) */
  height: z.number().int().min(480).max(1920).default(844),
  /** Wait for this many ms after page load before screenshot */
  waitMs: z.number().int().min(0).max(10000).default(2000),
  /** Return format */
  format: z.enum(['png', 'jpeg', 'webp']).default('png'),
});

/**
 * POST /api/orchestrator/screenshot
 *
 * Takes a screenshot of a URL using Puppeteer (if installed).
 * Returns base64-encoded image.
 *
 * Puppeteer is an optional dependency — if not installed, returns 501.
 * Install with: npm install puppeteer
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const validation = ScreenshotSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { url, width, height, waitMs, format } = validation.data;

    // Try to load puppeteer — it's an optional dependency
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let puppeteer: any;
    try {
      // Dynamic require to avoid TS/bundler resolution errors when not installed
      const moduleName = 'puppeteer';
      puppeteer = await import(moduleName);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Puppeteer is not installed. Install it with: npm install puppeteer',
          hint: 'Screenshots are an optional feature. The orchestrator works without them.',
        },
        { status: 501 },
      );
    }

    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 2 });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      const screenshotBuffer = await page.screenshot({
        type: format === 'jpeg' ? 'jpeg' : format === 'webp' ? 'webp' : 'png',
        fullPage: false,
      });

      const base64 = Buffer.from(screenshotBuffer).toString('base64');
      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

      return NextResponse.json({
        success: true,
        screenshot: `data:${mimeType};base64,${base64}`,
        width,
        height,
        format,
        url,
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('[Screenshot] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Screenshot failed' },
      { status: 500 },
    );
  }
}
