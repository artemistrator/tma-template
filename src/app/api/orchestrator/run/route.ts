import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { createPipelineRunner } from '@/lib/orchestrator/pipeline';
import { createRateLimiter } from '@/lib/rate-limit';
import { trackAssembly } from '@/lib/orchestrator/analytics';

const limiter = createRateLimiter({ limit: 5, windowMs: 3_600_000, prefix: 'orch-run' }); // 5/hour

const RunPipelineSchema = z.object({
  appType: z.enum(['ecommerce', 'booking', 'infobiz']),
  name: z.string().min(1),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  locale: z.string().default('en'),
  currency: z.string().default('USD'),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),

  items: z.array(z.object({
    name: z.string().min(1),
    price: z.number().nonnegative(),
    category: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    stock_quantity: z.number().optional(),
    duration: z.number().optional(),
    type: z.enum(['article', 'pdf', 'course', 'consultation']).optional(),
    slug: z.string().optional(),
    content: z.string().optional(),
    external_url: z.string().optional(),
    status: z.string().optional(),
  })).min(1),

  staff: z.array(z.object({
    name: z.string().min(1),
    role: z.string().optional(),
    bio: z.string().optional(),
    image: z.string().optional(),
  })).optional(),

  workingHours: z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string(),
    end_time: z.string(),
    is_day_off: z.boolean().default(false),
  })).optional(),

  /** Logo asset UUID (uploaded beforehand) */
  logoAssetId: z.string().optional(),

  /** Home page scenario */
  homeScenario: z.string().optional(),

  /** Contact info */
  contacts: z.object({
    phone: z.string().optional(),
    telegram: z.string().optional(),
    whatsapp: z.string().optional(),
    address: z.string().optional(),
    socials: z.array(z.object({
      type: z.enum(['instagram', 'vk', 'youtube', 'tiktok']),
      url: z.string(),
    })).optional(),
  }).optional(),

  /** Brand style preset */
  style: z.object({
    tone: z.enum(['premium', 'friendly', 'bold', 'minimal']).optional(),
    density: z.enum(['airy', 'balanced', 'compact']).optional(),
    visual: z.enum(['soft', 'sharp', 'layered']).optional(),
  }).optional(),

  /** CTA button */
  cta: z.object({
    text: z.string().optional(),
    sticky: z.boolean().default(true),
    page: z.string().default('catalog'),
    secondaryText: z.string().optional(),
    secondaryAction: z.string().optional(),
  }).optional(),

  /** Section visibility toggles */
  sections: z.record(z.string(), z.boolean()).optional(),
  /** Section display order */
  sectionOrder: z.array(z.string()).optional(),
});

/**
 * POST /api/orchestrator/run
 *
 * The "GO button" endpoint. Accepts a structured brief and runs the full
 * auto-pipeline: create tenant → seed data → health check.
 *
 * This is the deterministic path (no LLM needed). The form UI calls this
 * after the user fills in the brief and presses GO.
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const validation = RunPipelineSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const brief = validation.data;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const secret = process.env.ORCHESTRATOR_SECRET || '';

    const runner = createPipelineRunner({ appUrl, secret });

    console.log(`[Orchestrator] Running auto-pipeline for "${brief.name}" (${brief.appType})`);

    const startTime = Date.now();

    const result = await runner.runAutoPipeline({
      appType: brief.appType,
      name: brief.name,
      slug: brief.slug,
      locale: brief.locale,
      currency: brief.currency,
      primaryColor: brief.primaryColor,
      secondaryColor: brief.secondaryColor,
      items: brief.items,
      staff: brief.staff,
      workingHours: brief.workingHours,
      logoAssetId: brief.logoAssetId,
      style: brief.style,
      homeScenario: brief.homeScenario,
      contacts: brief.contacts,
      cta: brief.cta,
      sections: brief.sections,
      sectionOrder: brief.sectionOrder,
    });

    const durationMs = Date.now() - startTime;

    console.log(`[Orchestrator] Pipeline ${result.success ? 'completed' : 'failed'} for "${brief.slug}" in ${durationMs}ms:`,
      result.steps.map(s => `${s.step}: ${s.success ? 'ok' : s.error}`).join(', '),
    );

    // Track analytics (fire-and-forget)
    trackAssembly({
      slug: brief.slug,
      appType: brief.appType,
      success: result.success,
      itemCount: brief.items.length,
      locale: brief.locale,
      currency: brief.currency,
      durationMs,
      error: result.success ? undefined : result.steps.find(s => !s.success)?.error,
    }).catch((err) => console.error('[Analytics] Track error:', err));

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Pipeline failed', steps: result.steps, slug: brief.slug },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      tenantId: result.tenantId,
      slug: result.slug,
      appUrl: result.appUrl,
      steps: result.steps,
      message: `App "${brief.name}" assembled successfully`,
    });
  } catch (error) {
    console.error('[Orchestrator] Pipeline error:', error);
    return NextResponse.json(
      { success: false, error: 'Pipeline execution failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
