import { NextRequest, NextResponse } from 'next/server';
import { validateMiniAppSchema } from '@/lib/schema/mini-app-schema';
import { COMPONENT_MANIFEST } from '@/lib/schema/component-manifest';

interface ValidationIssue {
  level: 'error' | 'warning';
  path: string;
  message: string;
}

/**
 * POST /api/orchestrator/validate
 *
 * Deep validation of a MiniAppSchemaType config.
 * Goes beyond Zod schema: checks navigation targets, data completeness,
 * component compatibility, and more.
 *
 * Body: MiniAppSchemaType JSON
 * Returns: { valid: boolean, errors: Issue[], warnings: Issue[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const issues: ValidationIssue[] = [];

    // ── Step 1: Zod schema validation ──────────────────────────────────
    const zodResult = validateMiniAppSchema(body);
    if (!zodResult.success) {
      const zodIssues = zodResult.error?.issues || [];
      for (const issue of zodIssues) {
        issues.push({
          level: 'error',
          path: issue.path?.join('.') || 'root',
          message: issue.message,
        });
      }
      // Return early — if Zod fails, deeper checks won't work
      return NextResponse.json({
        valid: false,
        errors: issues.filter(i => i.level === 'error'),
        warnings: issues.filter(i => i.level === 'warning'),
      });
    }

    const config = zodResult.data;
    if (!config) {
      issues.push({ level: 'error', path: 'root', message: 'Config is empty after validation' });
      return NextResponse.json({ valid: false, errors: issues, warnings: [] });
    }

    // ── Step 2: Collect all page IDs ───────────────────────────────────
    const pageIds = new Set(config.pages.map(p => p.id));

    // Must have a "home" page
    if (!pageIds.has('home')) {
      issues.push({ level: 'error', path: 'pages', message: 'Missing required page with id "home"' });
    }

    // Must have a "catalog" page
    if (!pageIds.has('catalog')) {
      issues.push({ level: 'warning', path: 'pages', message: 'Missing page with id "catalog" — recommended for all app types' });
    }

    // ── Step 3: Check navigation targets ───────────────────────────────
    const navPropNames = ['ctaPage', 'onSuccess', 'onContinue', 'onCheckout', 'onOrderClick', 'onPaymentSuccess'];

    for (const page of config.pages) {
      for (let ci = 0; ci < page.components.length; ci++) {
        const comp = page.components[ci];
        const compPath = `pages[${page.id}].components[${ci}]`;
        const props = (comp.props || {}) as Record<string, unknown>;

        for (const propName of navPropNames) {
          const value = props[propName];
          if (typeof value === 'string') {
            // Strip "navigate:" prefix
            const targetPage = value.replace(/^navigate:/, '');
            if (targetPage && !pageIds.has(targetPage)) {
              issues.push({
                level: 'error',
                path: `${compPath}.props.${propName}`,
                message: `Navigation target "${targetPage}" does not match any page id. Available: ${Array.from(pageIds).join(', ')}`,
              });
            }
          }
        }

        // ── Step 4: Check component type is known ──────────────────────
        if (!COMPONENT_MANIFEST[comp.type]) {
          issues.push({
            level: 'warning',
            path: `${compPath}.type`,
            message: `Component type "${comp.type}" is not in the manifest. It may not render.`,
          });
        }

        // ── Step 5: Check component compatibility with appType ─────────
        const manifest = COMPONENT_MANIFEST[comp.type];
        if (manifest && !manifest.compatibleWith.includes(config.meta.appType)) {
          issues.push({
            level: 'warning',
            path: `${compPath}.type`,
            message: `"${comp.type}" is not designed for appType "${config.meta.appType}". Compatible with: ${manifest.compatibleWith.join(', ')}`,
          });
        }

        // ── Step 6: Check required props ───────────────────────────────
        if (manifest) {
          for (const [propName, propDef] of Object.entries(manifest.props)) {
            if (propDef.required && (props[propName] === undefined || props[propName] === null)) {
              // Data arrays passed from Directus might be empty but present
              if (propDef.type === 'array' && Array.isArray(props[propName])) continue;
              issues.push({
                level: 'warning',
                path: `${compPath}.props.${propName}`,
                message: `Required prop "${propName}" is missing for "${comp.type}"`,
              });
            }
          }
        }

        // ── Step 7: Check data arrays are not empty ────────────────────
        const dataArray = props['data'] || props['items'];
        if (Array.isArray(dataArray) && dataArray.length === 0) {
          issues.push({
            level: 'warning',
            path: `${compPath}.props.data`,
            message: `"${comp.type}" has an empty data/items array — nothing will render`,
          });
        }
      }
    }

    // ── Step 8: Meta checks ────────────────────────────────────────────
    if (!config.meta.slug) {
      issues.push({ level: 'error', path: 'meta.slug', message: 'Tenant slug is required' });
    }
    if (!config.meta.tenantId) {
      issues.push({ level: 'error', path: 'meta.tenantId', message: 'Tenant ID is required' });
    }
    if (!config.meta.theme?.primaryColor) {
      issues.push({ level: 'warning', path: 'meta.theme.primaryColor', message: 'No primary color set — default will be used' });
    }

    const errors = issues.filter(i => i.level === 'error');
    const warnings = issues.filter(i => i.level === 'warning');

    return NextResponse.json({
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        pageCount: config.pages.length,
        componentCount: config.pages.reduce((sum, p) => sum + p.components.length, 0),
        appType: config.meta.appType,
        locale: config.meta.locale,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { valid: false, errors: [{ level: 'error', path: 'root', message: error instanceof Error ? error.message : 'Invalid JSON' }], warnings: [] },
      { status: 400 }
    );
  }
}
