import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { createRateLimiter } from '@/lib/rate-limit';
import {
  getLLMConfig,
  generateFullPipelineWithLoop,
  generateItems,
  generateMarketing,
  isLLMAvailable,
} from '@/lib/orchestrator/llm-client';
import { createPipelineRunner } from '@/lib/orchestrator/pipeline';
import { trackAssembly } from '@/lib/orchestrator/analytics';

export const dynamic = 'force-dynamic';

const limiter = createRateLimiter({ limit: 20, windowMs: 3_600_000, prefix: 'orch-gen' }); // 20/hour

const GenerateSchema = z.object({
  mode: z.enum(['full', 'items', 'marketing']),
  prompt: z.string().min(1, 'Prompt is required'),
  appType: z.enum(['ecommerce', 'booking', 'infobiz']).optional(),
  context: z.object({
    name: z.string().optional(),
    items: z.array(z.object({
      name: z.string(),
      category: z.string().optional(),
    })).optional(),
    locale: z.string().optional(),
  }).optional(),
});

/**
 * POST /api/orchestrator/generate
 *
 * AI-powered generation for the orchestrator.
 *
 * Modes:
 * - full:      Free text → LLM generates tool calls → pipeline executes → app created
 * - items:     Business description → LLM generates products/services array
 * - marketing: Business + items context → LLM generates features/testimonials/FAQ
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  const blocked = limiter.check(request);
  if (blocked) return blocked;

  if (!isLLMAvailable()) {
    return NextResponse.json(
      { success: false, error: 'LLM not configured. Set OPENROUTER_API_KEY in .env.local' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const validation = GenerateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { mode, prompt, appType, context } = validation.data;
    const llmConfig = getLLMConfig()!;

    console.log(`[Generate] mode=${mode}, appType=${appType || 'auto'}, prompt="${prompt.slice(0, 80)}..."`);

    // ── Mode: items ──────────────────────────────────────────────────────
    if (mode === 'items') {
      if (!appType) {
        return NextResponse.json(
          { success: false, error: 'appType is required for items mode' },
          { status: 400 },
        );
      }

      const result = await generateItems(llmConfig, appType, prompt);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'LLM generation failed' },
          { status: 502 },
        );
      }

      // Parse items from response
      let items = result.json;
      if (items && typeof items === 'object' && !Array.isArray(items)) {
        // Some models wrap in { "items": [...] } or { "products": [...] }
        const obj = items as Record<string, unknown>;
        items = obj.items || obj.products || obj.services || Object.values(obj)[0];
      }

      if (!Array.isArray(items)) {
        return NextResponse.json(
          { success: false, error: 'LLM returned invalid items format', raw: result.content },
          { status: 502 },
        );
      }

      console.log(`[Generate] Generated ${items.length} items for ${appType}`);

      return NextResponse.json({
        success: true,
        mode: 'items',
        items,
        usage: result.usage,
      });
    }

    // ── Mode: marketing ──────────────────────────────────────────────────
    if (mode === 'marketing') {
      if (!appType) {
        return NextResponse.json(
          { success: false, error: 'appType is required for marketing mode' },
          { status: 400 },
        );
      }

      const businessName = context?.name || prompt;
      const existingItems = context?.items || [];
      const locale = context?.locale || 'en';

      const result = await generateMarketing(llmConfig, appType, businessName, existingItems, locale);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'LLM generation failed' },
          { status: 502 },
        );
      }

      const marketing = result.json as Record<string, unknown> | undefined;
      if (!marketing) {
        return NextResponse.json(
          { success: false, error: 'LLM returned invalid marketing format', raw: result.content },
          { status: 502 },
        );
      }

      console.log(`[Generate] Generated marketing copy for "${businessName}"`);

      return NextResponse.json({
        success: true,
        mode: 'marketing',
        marketing,
        usage: result.usage,
      });
    }

    // ── Mode: full (multi-turn tool calling loop) ─────────────────────────
    if (mode === 'full') {
      const startTime = Date.now();

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
      const secret = process.env.ORCHESTRATOR_SECRET || '';
      const runner = createPipelineRunner({ appUrl, secret });

      const multiResult = await generateFullPipelineWithLoop(
        llmConfig,
        prompt,
        appType,
        (name, args) => runner.executeTool(name, args),
      );

      const durationMs = Date.now() - startTime;

      if (!multiResult.success) {
        return NextResponse.json({
          success: false,
          error: multiResult.error || 'LLM pipeline failed',
          steps: multiResult.allToolCalls.map(tc => ({
            tool: tc.name,
            success: tc.result.success,
            error: tc.result.error,
          })),
          llmUsage: multiResult.totalUsage,
          iterations: multiResult.iterations,
          durationMs,
        }, { status: 502 });
      }

      const allSuccess = multiResult.allToolCalls.every(tc => tc.result.success);

      // Extract slug and tenantId from results
      const tenantCall = multiResult.allToolCalls.find(tc => tc.name === 'create_tenant');
      const tenantData = tenantCall?.result.data as Record<string, unknown> | undefined;
      const slug = (tenantData?.slug as string) || '';
      const tenantId = (tenantData?.tenantId as string) || '';

      // Track analytics
      const detectedAppType = tenantCall?.arguments?.businessType as string || appType || 'ecommerce';

      trackAssembly({
        appType: detectedAppType as 'ecommerce' | 'booking' | 'infobiz',
        slug,
        success: allSuccess,
        durationMs,
        itemCount: multiResult.allToolCalls.filter(tc => tc.name.startsWith('create_')).length,
        locale: 'en',
        currency: 'USD',
      }).catch(() => {});

      // Subdomain URL if ROOT_DOMAIN is set
      const rootDomain = process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';
      const finalAppUrl = slug
        ? (rootDomain ? `https://${slug}.${rootDomain}` : `${appUrl}/?tenant=${slug}`)
        : '';

      console.log(`[Generate] Completed in ${multiResult.iterations} iterations, ${multiResult.allToolCalls.length} tool calls:`,
        multiResult.allToolCalls.map(tc => `${tc.name}(${tc.result.success ? 'ok' : 'fail'})`).join(', '));

      return NextResponse.json({
        success: allSuccess,
        mode: 'full',
        tenantId,
        slug,
        appUrl: finalAppUrl,
        steps: multiResult.allToolCalls.map(tc => ({
          tool: tc.name,
          success: tc.result.success,
          error: tc.result.error,
        })),
        llmUsage: multiResult.totalUsage,
        iterations: multiResult.iterations,
        durationMs,
        message: allSuccess
          ? `App assembled via AI in ${(durationMs / 1000).toFixed(1)}s (${multiResult.iterations} LLM calls, ${multiResult.allToolCalls.length} tools)`
          : 'AI pipeline partially failed',
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown mode: ${mode}` },
      { status: 400 },
    );
  } catch (error) {
    console.error('[Generate] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Generation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/orchestrator/generate
 * Check if LLM is available and return model info.
 */
export async function GET(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  return NextResponse.json({
    available: isLLMAvailable(),
    model: process.env.OPENROUTER_MODEL || 'qwen/qwen3-coder',
  });
}
