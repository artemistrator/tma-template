import { NextRequest, NextResponse } from 'next/server';
import { getTenantConfig, tenantExists, getAvailableTenants } from '@/lib/tenant-registry';
import { validateMiniAppSchema, type MiniAppSchemaType } from '@/lib/schema/mini-app-schema';

/**
 * GET /api/config
 * 
 * Returns app configuration based on tenant slug.
 * 
 * Query Params:
 *  - tenant: Tenant slug (required) - e.g., 'pizza', 'barber'
 * 
 * Headers:
 *  - x-tenant-id: Tenant identifier (optional, fallback if query param not provided)
 * 
 * Response:
 *  - success: boolean
 *  - config: MiniAppSchemaType (if found)
 *  - error: string (if not found)
 */
export async function GET(request: NextRequest) {
  try {
    // Get tenant slug from query param (primary) or header (fallback)
    const tenantSlugFromQuery = request.nextUrl.searchParams.get('tenant');
    const tenantSlugFromHeader = request.headers.get('x-tenant-slug');
    const tenantSlug = tenantSlugFromQuery || tenantSlugFromHeader || 'pizza';

    console.log(`[Config API] Request received for tenant slug: ${tenantSlug}`);
    console.log(`[Config API] Available tenants: ${getAvailableTenants().join(', ')}`);

    // Check if tenant exists in registry
    if (!tenantExists(tenantSlug)) {
      console.warn(`[Config API] Tenant not found: ${tenantSlug}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Tenant not found',
          message: `No configuration found for tenant '${tenantSlug}'. Available tenants: ${getAvailableTenants().join(', ')}`,
          availableTenants: getAvailableTenants(),
        },
        { status: 404 }
      );
    }

    // Get tenant config from registry
    const config: MiniAppSchemaType | null = getTenantConfig(tenantSlug);
    
    if (!config) {
      console.error(`[Config API] Config is null for tenant: ${tenantSlug}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration not found',
        },
        { status: 500 }
      );
    }

    // Validate config before returning
    const validation = validateMiniAppSchema(config);
    if (!validation.success) {
      console.error('[Config API] Schema validation failed:', validation.error);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid configuration schema',
          details: validation.error?.issues || [],
        },
        { status: 500 }
      );
    }

    console.log(`[Config API] Config returned successfully:`, {
      tenantSlug,
      title: validation.data?.meta.title,
      appType: validation.data?.meta.appType,
      tenantId: validation.data?.meta.tenantId,
    });

    return NextResponse.json({
      success: true,
      config: validation.data,
      tenantSlug,
      tenantId: validation.data?.meta.tenantId || '',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Config API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
