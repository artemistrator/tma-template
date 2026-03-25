import { z } from 'zod';

// App type enum - defines the business type
export const AppTypeSchema = z.enum(['ecommerce', 'booking', 'infobiz']);
export type AppType = z.infer<typeof AppTypeSchema>;

// Base component props schema
export const BaseComponentPropsSchema = z.object({
  className: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

// Data binding schema
export const DataBindingSchema = z.object({
  source: z.string().describe('Data source key (e.g., "products", "categories")'),
  transform: z.string().optional().describe('Optional transform function name'),
  filter: z.string().optional().describe('Optional filter function name'),
});

// Component instance schema (recursive - defined using lazy)
export type ComponentInstance = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  binding?: {
    source: string;
    transform?: string;
    filter?: string;
  };
  children?: ComponentInstance[];
  events?: Record<string, unknown>;
};

export const ComponentInstanceSchema: z.ZodType<ComponentInstance> = z.lazy(() => z.object({
  id: z.string().optional(),
  type: z.string(),
  props: z.record(z.string(), z.unknown()).optional(),
  binding: DataBindingSchema.optional(),
  children: z.array(ComponentInstanceSchema).optional(),
  events: z.record(z.string(), z.unknown()).optional(),
}));

// Page schema
export const PageSchema = z.object({
  id: z.string(),
  title: z.string(),
  route: z.string(),
  components: z.array(ComponentInstanceSchema),
  mainButton: z.object({
    visible: z.boolean().optional(),
    text: z.string().optional(),
    color: z.string().optional(),
    action: z.string().optional(),
  }).optional(),
  backButton: z.object({
    visible: z.boolean().optional(),
    action: z.string().optional(),
  }).optional(),
});

// Data model entity schema
export const DataModelEntitySchema = z.object({
  name: z.string(),
  fields: z.record(z.string(), z.object({
    type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
    required: z.boolean().optional(),
    description: z.string().optional(),
  })),
});

// Meta schema - now includes multi-tenant fields
export const MetaSchema = z.object({
  title: z.string(),
  logo: z.string().optional(),
  locale: z.string().default('en'),
  currency: z.string().default('USD'),
  theme: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
  }).optional(),
  style: z.object({
    tone: z.enum(['premium', 'friendly', 'bold', 'minimal']).optional(),
    density: z.enum(['airy', 'balanced', 'compact']).optional(),
    visual: z.enum(['soft', 'sharp', 'layered']).optional(),
  }).optional(),
  cta: z.object({
    text: z.string().optional(),
    sticky: z.boolean().default(true),
    page: z.string().default('catalog'),
    secondaryText: z.string().optional(),
    secondaryAction: z.string().optional(),
  }).optional(),
  // Multi-tenant fields
  appType: AppTypeSchema.default('ecommerce').describe('Type of business: ecommerce, booking, or infobiz'),
  tenantId: z.string().describe('Unique tenant identifier'),
  slug: z.string().describe('URL-friendly identifier for the tenant'),
  // Payment & delivery config (passed to frontend, secrets stripped)
  payments: z.object({
    methods: z.array(z.enum(['yookassa', 'stars', 'cash'])),
    testMode: z.boolean().optional(),
  }).optional(),
  delivery: z.object({
    methods: z.array(z.enum(['pickup', 'courier', 'cdek'])),
    pickupPoints: z.array(z.object({
      id: z.string(),
      name: z.string(),
      address: z.string(),
      city: z.string().optional(),
      phone: z.string().optional(),
      workingHours: z.string().optional(),
    })).optional(),
    courier: z.object({
      price: z.number(),
      freeFrom: z.number().optional(),
      estimatedTime: z.string().optional(),
      estimatedDays: z.string().optional(),
      zone: z.string().optional(),
    }).optional(),
  }).optional(),
});

// Flow action schema
export const FlowActionSchema = z.object({
  id: z.string(),
  type: z.enum(['navigate', 'addToCart', 'removeFromCart', 'startPayment', 'showModal', 'apiCall']),
  target: z.string().optional().describe('Target pageId, componentId, or API endpoint'),
  params: z.record(z.string(), z.unknown()).optional(),
});

// Flow schema
export const FlowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  steps: z.array(z.string()).describe('Page IDs in order'),
  actions: z.array(FlowActionSchema).optional(),
});

// Features config (feature flags exposed to the frontend)
export const FeaturesSchema = z.object({
  reviews: z.object({
    enabled: z.boolean().optional(),
    businessReviews: z.boolean().optional(),
    productReviews: z.boolean().optional(),
    allowSubmission: z.boolean().optional(),
    moderation: z.boolean().optional(),
  }).optional(),
  assistant: z.object({
    enabled: z.boolean().optional(),
    mode: z.string().optional(),
    botUsername: z.string().optional(),
    entryCta: z.string().optional(),
    placement: z.enum(['floating', 'header', 'contacts', 'product_page']).optional(),
  }).optional(),
}).optional();

// Main MiniApp Schema
export const MiniAppSchema = z.object({
  meta: MetaSchema,
  features: FeaturesSchema,
  dataModel: z.record(z.string(), DataModelEntitySchema).optional(),
  pages: z.array(PageSchema),
  flows: z.array(FlowSchema).optional(),
  apiEndpoints: z.record(z.string(), z.object({
    url: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    headers: z.record(z.string(), z.string()).optional(),
  })).optional(),
});

// Type exports
export type Page = z.infer<typeof PageSchema>;
export type MiniAppSchemaType = z.infer<typeof MiniAppSchema>;
export type Flow = z.infer<typeof FlowSchema>;
export type FlowAction = z.infer<typeof FlowActionSchema>;

// Validation function
export function validateMiniAppSchema(data: unknown): { success: boolean; data?: MiniAppSchemaType; error?: z.ZodError } {
  const result = MiniAppSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
