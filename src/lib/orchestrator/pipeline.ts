/**
 * Orchestrator Pipeline Runner
 *
 * Executes tool calls from the LLM by routing them to the internal API endpoints.
 * LLM-agnostic: works with any provider that returns tool/function calls.
 *
 * Usage:
 *   const runner = createPipelineRunner({ appUrl, secret });
 *   const result = await runner.executeTool('create_tenant', { name: '...', slug: '...', ... });
 */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface PipelineConfig {
  /** Base URL of the app, e.g. "http://localhost:3000" */
  appUrl: string;
  /** ORCHESTRATOR_SECRET for API auth */
  secret: string;
}

export interface ToolCallResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface ToolRoute {
  method: 'GET' | 'POST' | 'DELETE';
  path: string | ((args: Record<string, unknown>) => string);
  /** Transform tool call args → request body */
  mapBody?: (args: Record<string, unknown>) => unknown;
}

/**
 * Mapping from tool name → API route + body transform
 */
const TOOL_ROUTES: Record<string, ToolRoute> = {
  create_tenant: {
    method: 'POST',
    path: '/api/orchestrator/tenant',
    mapBody: (args) => ({
      name: args.name,
      slug: args.slug,
      config: {
        businessType: args.businessType,
        currency: args.currency || 'USD',
        locale: args.locale || 'en',
        theme: {
          primaryColor: args.primaryColor,
          secondaryColor: args.secondaryColor,
        },
        ...(args.logo ? { logo: args.logo } : {}),
        ...(args.style ? { style: args.style } : {}),
        ...(args.homeScenario ? { homeScenario: args.homeScenario } : {}),
        ...(args.contacts ? { contacts: args.contacts } : {}),
        ...(args.cta ? { cta: args.cta } : {}),
        ...(args.sections ? { sections: args.sections } : {}),
        ...(args.sectionOrder ? { sectionOrder: args.sectionOrder } : {}),
      },
    }),
  },

  delete_tenant: {
    method: 'DELETE',
    path: (args) => `/api/orchestrator/tenant/${args.slug}`,
  },

  create_products: {
    method: 'POST',
    path: '/api/orchestrator/products',
  },

  create_services: {
    method: 'POST',
    path: '/api/orchestrator/services',
  },

  create_info_products: {
    method: 'POST',
    path: '/api/orchestrator/info-products',
    mapBody: (args) => ({
      tenantSlug: args.tenantSlug,
      products: args.products,
    }),
  },

  create_staff: {
    method: 'POST',
    path: '/api/orchestrator/staff',
  },

  set_working_hours: {
    method: 'POST',
    path: '/api/orchestrator/working-hours',
    mapBody: (args) => ({
      tenantSlug: args.tenantSlug,
      hours: args.hours,
    }),
  },

  set_marketing: {
    method: 'POST',
    path: '/api/orchestrator/marketing',
  },

  upload_image: {
    method: 'POST',
    path: '/api/orchestrator/upload',
  },

  upload_images_batch: {
    method: 'POST',
    path: '/api/orchestrator/upload/batch',
    mapBody: (args) => ({
      images: args.images,
    }),
  },

  validate_config: {
    method: 'POST',
    path: '/api/orchestrator/validate',
    mapBody: (args) => args.config,
  },

  check_health: {
    method: 'GET',
    path: (args) => `/api/orchestrator/health/${args.slug}`,
  },

  save_direct_config: {
    method: 'POST',
    path: '/api/config/direct',
    mapBody: (args) => args.config,
  },

  add_tenant_admin: {
    method: 'POST',
    path: '/api/orchestrator/tenant-admin',
  },
};

export function createPipelineRunner(config: PipelineConfig) {
  const { appUrl, secret } = config;

  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 1000;

  async function executeTool(
    toolName: string,
    args: Record<string, unknown>,
    retries = MAX_RETRIES,
  ): Promise<ToolCallResult> {
    const route = TOOL_ROUTES[toolName];
    if (!route) {
      return { success: false, error: `Unknown tool: "${toolName}"` };
    }

    const path = typeof route.path === 'function' ? route.path(args) : route.path;
    const url = `${appUrl}${path}`;
    const body = route.mapBody ? route.mapBody(args) : args;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const fetchOptions: RequestInit = {
          method: route.method,
          headers: {
            'Authorization': `Bearer ${secret}`,
            'Content-Type': 'application/json',
          },
        };

        if (route.method !== 'GET' && body) {
          fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);
        const data = await response.json();

        if (!response.ok) {
          // Don't retry client errors (4xx) — only server/network errors
          if (response.status >= 400 && response.status < 500) {
            return {
              success: false,
              error: data.error || `HTTP ${response.status}`,
              data,
            };
          }

          // Retry on 5xx
          if (attempt < retries) {
            console.warn(`[Pipeline] ${toolName} failed (attempt ${attempt + 1}/${retries + 1}), retrying...`);
            await sleep(RETRY_DELAY_MS * (attempt + 1));
            continue;
          }

          return {
            success: false,
            error: data.error || `HTTP ${response.status} (after ${retries + 1} attempts)`,
            data,
          };
        }

        return { success: true, data };
      } catch (error) {
        if (attempt < retries) {
          console.warn(`[Pipeline] ${toolName} network error (attempt ${attempt + 1}/${retries + 1}), retrying...`);
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        return {
          success: false,
          error: (error instanceof Error ? error.message : 'Network error') + ` (after ${retries + 1} attempts)`,
        };
      }
    }

    return { success: false, error: 'Unexpected retry exit' };
  }

  /**
   * Execute a full sequence of tool calls (from LLM response).
   * Stops on first failure unless `continueOnError` is true.
   */
  async function executeToolCalls(
    calls: Array<{ name: string; arguments: Record<string, unknown> }>,
    options?: { continueOnError?: boolean },
  ): Promise<Array<{ tool: string; result: ToolCallResult }>> {
    const results: Array<{ tool: string; result: ToolCallResult }> = [];

    for (const call of calls) {
      const result = await executeTool(call.name, call.arguments);
      results.push({ tool: call.name, result });

      if (!result.success && !options?.continueOnError) {
        break;
      }
    }

    return results;
  }

  /**
   * Run the full pipeline for a brief — deterministic, no LLM needed.
   * This is the "Auto" mode: creates tenant → seeds data → health check.
   */
  async function runAutoPipeline(brief: {
    appType: 'ecommerce' | 'booking' | 'infobiz';
    name: string;
    slug: string;
    locale?: string;
    currency?: string;
    primaryColor?: string;
    secondaryColor?: string;
    items: Array<Record<string, unknown>>;
    staff?: Array<Record<string, unknown>>;
    workingHours?: Array<Record<string, unknown>>;
    adminTelegramId?: number;
    adminName?: string;
    /** Logo asset UUID — stored in tenant.config.logo */
    logoAssetId?: string;
    /** Brand style preset */
    style?: { tone?: string; density?: string; visual?: string };
    /** Home page scenario */
    homeScenario?: string;
    /** Contact info */
    contacts?: { phone?: string; telegram?: string; whatsapp?: string; address?: string; socials?: Array<{ type: string; url: string }> };
    /** CTA button */
    cta?: { text?: string; sticky?: boolean; page?: string; secondaryText?: string; secondaryAction?: string };
    /** Section visibility */
    sections?: Record<string, boolean>;
    /** Section order */
    sectionOrder?: string[];
  }): Promise<{
    success: boolean;
    tenantId?: string;
    slug: string;
    appUrl: string;
    steps: Array<{ step: string; success: boolean; error?: string }>;
  }> {
    const steps: Array<{ step: string; success: boolean; error?: string }> = [];

    // Step 1: Create tenant
    const tenantResult = await executeTool('create_tenant', {
      name: brief.name,
      slug: brief.slug,
      businessType: brief.appType,
      currency: brief.currency || 'USD',
      locale: brief.locale || 'en',
      primaryColor: brief.primaryColor,
      secondaryColor: brief.secondaryColor,
      logo: brief.logoAssetId,
      style: brief.style,
      homeScenario: brief.homeScenario,
      contacts: brief.contacts,
      cta: brief.cta,
      sections: brief.sections,
      sectionOrder: brief.sectionOrder,
    });

    steps.push({
      step: 'create_tenant',
      success: tenantResult.success,
      error: tenantResult.error,
    });

    if (!tenantResult.success) {
      return { success: false, slug: brief.slug, appUrl: '', steps };
    }

    const tenantId = (tenantResult.data as Record<string, unknown>)?.tenantId as string;

    // Step 2: Seed data based on appType
    // Pass tenantId directly to avoid Directus SDK filter race condition
    if (brief.appType === 'ecommerce') {
      const r = await executeTool('create_products', {
        tenantSlug: brief.slug,
        tenantId,
        products: brief.items,
      });
      steps.push({ step: 'create_products', success: r.success, error: r.error });
      if (!r.success) return { success: false, tenantId, slug: brief.slug, appUrl: '', steps };
    }

    if (brief.appType === 'booking') {
      const r = await executeTool('create_services', {
        tenantSlug: brief.slug,
        tenantId,
        services: brief.items,
      });
      steps.push({ step: 'create_services', success: r.success, error: r.error });
      if (!r.success) return { success: false, tenantId, slug: brief.slug, appUrl: '', steps };

      if (brief.staff && brief.staff.length > 0) {
        const sr = await executeTool('create_staff', {
          tenantSlug: brief.slug,
          tenantId,
          staff: brief.staff,
        });
        steps.push({ step: 'create_staff', success: sr.success, error: sr.error });
      }

      if (brief.workingHours && brief.workingHours.length > 0) {
        const wr = await executeTool('set_working_hours', {
          tenantSlug: brief.slug,
          tenantId,
          hours: brief.workingHours,
        });
        steps.push({ step: 'set_working_hours', success: wr.success, error: wr.error });
      }
    }

    if (brief.appType === 'infobiz') {
      const r = await executeTool('create_info_products', {
        tenantSlug: brief.slug,
        tenantId,
        products: brief.items,
      });
      steps.push({ step: 'create_info_products', success: r.success, error: r.error });
      if (!r.success) return { success: false, tenantId, slug: brief.slug, appUrl: '', steps };
    }

    // Step 3: Health check
    const health = await executeTool('check_health', { slug: brief.slug });
    steps.push({ step: 'check_health', success: health.success, error: health.error });

    // Step 4: Add tenant admin (if telegram ID provided)
    if (brief.adminTelegramId) {
      const adminResult = await executeTool('add_tenant_admin', {
        tenantSlug: brief.slug,
        telegramId: brief.adminTelegramId,
        name: brief.adminName || brief.name,
        role: 'owner',
      });
      steps.push({ step: 'add_tenant_admin', success: adminResult.success, error: adminResult.error });
      // Non-critical — don't fail pipeline if admin creation fails
    }

    // Subdomain URL if ROOT_DOMAIN is set, otherwise fallback to query param
    const rootDomain = process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';
    const finalAppUrl = rootDomain
      ? `https://${brief.slug}.${rootDomain}`
      : `${appUrl}/?tenant=${brief.slug}`;

    return {
      success: steps.every(s => s.success),
      tenantId,
      slug: brief.slug,
      appUrl: finalAppUrl,
      steps,
    };
  }

  return {
    executeTool,
    executeToolCalls,
    runAutoPipeline,
  };
}

export type PipelineRunner = ReturnType<typeof createPipelineRunner>;
