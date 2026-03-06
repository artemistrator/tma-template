import { validateMiniAppSchema, MiniAppSchemaType } from '@/lib/schema/mini-app-schema';

describe('MiniAppSchema Validation', () => {
  const validSchema: MiniAppSchemaType = {
    meta: {
      title: 'Test Shop',
      locale: 'en',
      currency: 'USD',
    },
    pages: [
      {
        id: 'home',
        title: 'Home',
        route: '/',
        components: [
          {
            type: 'ProductList',
            props: { title: 'Featured' },
          },
        ],
      },
    ],
  };

  describe('validateMiniAppSchema', () => {
    it('validates correct schema successfully', () => {
      const result = validateMiniAppSchema(validSchema);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('fails when meta is missing', () => {
      const invalidSchema = { ...validSchema, meta: undefined };

      const result = validateMiniAppSchema(invalidSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('fails when pages is missing', () => {
      const invalidSchema = { ...validSchema, pages: undefined };

      const result = validateMiniAppSchema(invalidSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('fails when page is missing required fields', () => {
      const invalidSchema = {
        ...validSchema,
        pages: [
          {
            id: 'home',
            // missing title and route
            components: [],
          },
        ],
      };

      const result = validateMiniAppSchema(invalidSchema);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('accepts schema with optional theme', () => {
      const schemaWithTheme = {
        ...validSchema,
        meta: {
          ...validSchema.meta,
          theme: {
            primaryColor: '#007AFF',
            secondaryColor: '#5856D6',
          },
        },
      };

      const result = validateMiniAppSchema(schemaWithTheme);

      expect(result.success).toBe(true);
    });

    it('accepts schema with dataModel', () => {
      const schemaWithDataModel = {
        ...validSchema,
        dataModel: {
          Product: {
            name: 'Product',
            fields: {
              id: { type: 'string', required: true },
              name: { type: 'string', required: true },
              price: { type: 'number', required: true },
            },
          },
        },
      };

      const result = validateMiniAppSchema(schemaWithDataModel);

      expect(result.success).toBe(true);
    });

    it('accepts schema with flows', () => {
      const schemaWithFlows = {
        ...validSchema,
        flows: [
          {
            id: 'checkout-flow',
            name: 'Checkout Flow',
            steps: ['cart', 'checkout', 'payment'],
            actions: [
              {
                id: 'navigate-to-checkout',
                type: 'navigate',
                target: 'checkout',
              },
            ],
          },
        ],
      };

      const result = validateMiniAppSchema(schemaWithFlows);

      expect(result.success).toBe(true);
    });

    it('accepts schema with apiEndpoints', () => {
      const schemaWithEndpoints = {
        ...validSchema,
        apiEndpoints: {
          products: {
            url: '/api/products',
            method: 'GET',
          },
        },
      };

      const result = validateMiniAppSchema(schemaWithEndpoints);

      expect(result.success).toBe(true);
    });

    it('accepts component with binding', () => {
      const schemaWithBinding = {
        ...validSchema,
        pages: [
          {
            ...validSchema.pages[0],
            components: [
              {
                type: 'ProductList',
                binding: {
                  source: 'products',
                },
              },
            ],
          },
        ],
      };

      const result = validateMiniAppSchema(schemaWithBinding);

      expect(result.success).toBe(true);
    });

    it('accepts component with events', () => {
      const schemaWithEvents = {
        ...validSchema,
        pages: [
          {
            ...validSchema.pages[0],
            components: [
              {
                type: 'PaymentButton',
                events: {
                  onPaymentSuccess: 'navigate:confirmation',
                },
              },
            ],
          },
        ],
      };

      const result = validateMiniAppSchema(schemaWithEvents);

      expect(result.success).toBe(true);
    });

    it('accepts page with mainButton configuration', () => {
      const schemaWithMainButton = {
        ...validSchema,
        pages: [
          {
            ...validSchema.pages[0],
            mainButton: {
              visible: true,
              text: 'Checkout',
              action: 'navigate:checkout',
            },
          },
        ],
      };

      const result = validateMiniAppSchema(schemaWithMainButton);

      expect(result.success).toBe(true);
    });

    it('accepts page with backButton configuration', () => {
      const schemaWithBackButton = {
        ...validSchema,
        pages: [
          {
            ...validSchema.pages[0],
            backButton: {
              visible: true,
              action: 'home',
            },
          },
        ],
      };

      const result = validateMiniAppSchema(schemaWithBackButton);

      expect(result.success).toBe(true);
    });
  });
});
