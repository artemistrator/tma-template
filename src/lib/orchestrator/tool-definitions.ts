/**
 * LLM-agnostic tool/function definitions for the TMA Orchestrator.
 *
 * These follow the OpenAI/Anthropic-compatible JSON Schema format,
 * which is also supported by Vercel AI SDK, LiteLLM, and most LLM providers.
 *
 * Usage:
 *   import { ORCHESTRATOR_TOOLS } from '@/lib/orchestrator/tool-definitions';
 *   // Pass to any LLM provider as function/tool definitions
 */

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const ORCHESTRATOR_TOOLS: ToolDefinition[] = [
  // ─── Tenant management ──────────────────────────────────────────
  {
    name: 'create_tenant',
    description: 'Create a new tenant (business) in Directus. Returns tenantId. Must be called before creating products/services.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Business name, e.g. "Pizza Palace"' },
        slug: { type: 'string', description: 'URL-friendly identifier (lowercase, dashes only), e.g. "pizza-palace"' },
        businessType: { type: 'string', enum: ['ecommerce', 'booking', 'infobiz'], description: 'Type of business' },
        currency: { type: 'string', description: 'ISO currency code, e.g. "RUB", "USD"', default: 'USD' },
        locale: { type: 'string', enum: ['ru', 'en'], description: 'Interface language', default: 'en' },
        primaryColor: { type: 'string', description: 'Brand color hex, e.g. "#c0392b"' },
        secondaryColor: { type: 'string', description: 'Accent color hex' },
      },
      required: ['name', 'slug', 'businessType'],
    },
  },

  {
    name: 'delete_tenant',
    description: 'Delete a tenant and ALL its data (products, services, orders, etc.). Use when rebuilding from scratch.',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Tenant slug to delete' },
      },
      required: ['slug'],
    },
  },

  // ─── Content creation ───────────────────────────────────────────
  {
    name: 'create_products',
    description: 'Bulk create products for an ecommerce tenant. Max 200 items per call.',
    parameters: {
      type: 'object',
      properties: {
        tenantSlug: { type: 'string', description: 'Tenant slug' },
        products: {
          type: 'array',
          description: 'Array of products to create',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Product name' },
              price: { type: 'number', description: 'Price in tenant currency' },
              category: { type: 'string', description: 'Category for grouping' },
              description: { type: 'string', description: 'Short description' },
              image: { type: 'string', description: 'Directus asset UUID (from upload_image)' },
              stock_quantity: { type: 'number', description: '-1=unlimited, 0=out of stock, >0=limited. Default: -1' },
            },
            required: ['name', 'price'],
          },
        },
      },
      required: ['tenantSlug', 'products'],
    },
  },

  {
    name: 'create_services',
    description: 'Bulk create services for a booking tenant. Max 200 items.',
    parameters: {
      type: 'object',
      properties: {
        tenantSlug: { type: 'string', description: 'Tenant slug' },
        services: {
          type: 'array',
          description: 'Array of services to create',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Service name' },
              price: { type: 'number', description: 'Price' },
              duration: { type: 'number', description: 'Duration in minutes' },
              category: { type: 'string', description: 'Category' },
              description: { type: 'string', description: 'Short description' },
              image: { type: 'string', description: 'Directus asset UUID' },
            },
            required: ['name', 'price'],
          },
        },
      },
      required: ['tenantSlug', 'services'],
    },
  },

  {
    name: 'create_info_products',
    description: 'Bulk create info products (courses, PDFs, articles, consultations) for an infobiz tenant.',
    parameters: {
      type: 'object',
      properties: {
        tenantSlug: { type: 'string', description: 'Tenant slug' },
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Product name' },
              slug: { type: 'string', description: 'URL slug for the product' },
              type: { type: 'string', enum: ['article', 'pdf', 'course', 'consultation'], description: 'Product type' },
              price: { type: 'number', description: 'Price (0 = free)' },
              description: { type: 'string', description: 'Short description' },
              content: { type: 'string', description: 'Full markdown content (for articles)' },
              image: { type: 'string', description: 'Directus asset UUID' },
              external_url: { type: 'string', description: 'External course/platform URL' },
            },
            required: ['name', 'slug', 'type', 'price'],
          },
        },
      },
      required: ['tenantSlug', 'products'],
    },
  },

  {
    name: 'create_staff',
    description: 'Create staff members for a booking tenant.',
    parameters: {
      type: 'object',
      properties: {
        tenantSlug: { type: 'string', description: 'Tenant slug' },
        staff: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Staff member name' },
              bio: { type: 'string', description: 'Short bio' },
              image: { type: 'string', description: 'Directus asset UUID' },
            },
            required: ['name'],
          },
        },
      },
      required: ['tenantSlug', 'staff'],
    },
  },

  {
    name: 'set_working_hours',
    description: 'Set working hours for a booking tenant. Replaces any existing schedule.',
    parameters: {
      type: 'object',
      properties: {
        tenantSlug: { type: 'string', description: 'Tenant slug' },
        hours: {
          type: 'array',
          description: 'Working hours for each day. day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday',
          items: {
            type: 'object',
            properties: {
              day_of_week: { type: 'number', description: '0=Sun, 1=Mon, ..., 6=Sat' },
              start_time: { type: 'string', description: 'HH:MM format, e.g. "09:00"' },
              end_time: { type: 'string', description: 'HH:MM format, e.g. "18:00"' },
              is_day_off: { type: 'boolean', description: 'true if closed this day', default: false },
            },
            required: ['day_of_week', 'start_time', 'end_time'],
          },
        },
      },
      required: ['tenantSlug', 'hours'],
    },
  },

  // ─── Asset management ───────────────────────────────────────────
  {
    name: 'upload_image',
    description: 'Upload a single image to Directus. Accepts URL or base64 data. Returns asset UUID for use in products/services.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Image URL to import (alternative to base64)' },
        base64: { type: 'string', description: 'Base64-encoded image data with MIME prefix (alternative to url)' },
        filename: { type: 'string', description: 'Filename, e.g. "product-photo.jpg"' },
      },
      required: ['filename'],
    },
  },

  {
    name: 'upload_images_batch',
    description: 'Upload multiple images at once. Max 50 images. Returns mapping of filename → assetId.',
    parameters: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          description: 'Array of images to upload',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Image URL' },
              base64: { type: 'string', description: 'Base64 data' },
              filename: { type: 'string', description: 'Filename' },
            },
            required: ['filename'],
          },
        },
      },
      required: ['images'],
    },
  },

  // ─── Marketing & content ───────────────────────────────────────
  {
    name: 'set_marketing',
    description: 'Set marketing content for a tenant: subtitle, features, testimonials, FAQ. Stored in tenant config. Call AFTER create_tenant.',
    parameters: {
      type: 'object',
      properties: {
        tenantSlug: { type: 'string', description: 'Tenant slug' },
        subtitle: { type: 'string', description: 'Short tagline for hero section (max 80 chars)' },
        features: {
          type: 'array',
          description: '4 business features/advantages',
          items: {
            type: 'object',
            properties: {
              icon: { type: 'string', description: 'Single emoji' },
              title: { type: 'string', description: 'Short title' },
              description: { type: 'string', description: 'One sentence' },
            },
            required: ['icon', 'title', 'description'],
          },
        },
        testimonials: {
          type: 'array',
          description: '3 customer reviews',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Customer name' },
              role: { type: 'string', description: 'Optional role/title' },
              rating: { type: 'number', description: '1-5 star rating' },
              text: { type: 'string', description: 'Review text' },
            },
            required: ['name', 'rating', 'text'],
          },
        },
        faq: {
          type: 'array',
          description: '4 FAQ items',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              answer: { type: 'string' },
            },
            required: ['question', 'answer'],
          },
        },
      },
      required: ['tenantSlug'],
    },
  },

  // ─── Validation & health ────────────────────────────────────────
  {
    name: 'validate_config',
    description: 'Validate a MiniAppSchemaType JSON config. Checks Zod schema, navigation targets, component compatibility, data completeness.',
    parameters: {
      type: 'object',
      properties: {
        config: { type: 'object', description: 'Full MiniAppSchemaType JSON object to validate' },
      },
      required: ['config'],
    },
  },

  {
    name: 'check_health',
    description: 'Check that a tenant is properly set up: exists in Directus, has data, config API responds correctly.',
    parameters: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Tenant slug to check' },
      },
      required: ['slug'],
    },
  },

  // ─── Direct config ──────────────────────────────────────────────
  {
    name: 'save_direct_config',
    description: 'Save a full MiniAppSchemaType config directly, bypassing Directus. Useful for prototyping or custom layouts. TTL: 30 days.',
    parameters: {
      type: 'object',
      properties: {
        config: { type: 'object', description: 'Full MiniAppSchemaType JSON config' },
      },
      required: ['config'],
    },
  },
];

/**
 * Get tool definitions formatted for specific LLM providers.
 */
export function getToolsForProvider(provider: 'openai' | 'anthropic' | 'generic'): unknown[] {
  if (provider === 'openai') {
    return ORCHESTRATOR_TOOLS.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  if (provider === 'anthropic') {
    return ORCHESTRATOR_TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }

  // Generic format (works with Vercel AI SDK, LiteLLM, etc.)
  return ORCHESTRATOR_TOOLS;
}
