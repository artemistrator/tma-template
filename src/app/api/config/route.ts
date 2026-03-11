import { NextRequest, NextResponse } from 'next/server';
import { demoConfig } from '@/config/demo';
import { validateMiniAppSchema, type MiniAppSchemaType } from '@/lib/schema/mini-app-schema';

/**
 * GET /api/config
 * 
 * Returns app configuration based on tenant ID.
 * 
 * Headers:
 *  - x-tenant-id: Tenant identifier (optional)
 * 
 * Query Params:
 *  - tenant: Tenant identifier (optional, fallback if header not provided)
 * 
 * Response:
 *  - MiniAppSchemaType: Validated app configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Get tenant ID from header or query param
    const tenantIdFromHeader = request.headers.get('x-tenant-id');
    const tenantIdFromQuery = request.nextUrl.searchParams.get('tenant');
    const tenantId = tenantIdFromHeader || tenantIdFromQuery || 'default';

    console.log(`[Config API] Request received for tenant: ${tenantId}`);

    // TODO: In production, fetch tenant config from database
    // For now, return demoConfig with tenant-specific overrides
    const config: MiniAppSchemaType = {
      ...demoConfig,
      meta: {
        ...demoConfig.meta,
        tenantId,
        slug: tenantId === 'default' ? 'demo-shop' : tenantId,
      },
    };

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

    console.log(`[Config API] Config returned successfully for tenant: ${tenantId}`);

    return NextResponse.json({
      success: true,
      config: validation.data,
      tenantId,
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
