/**
 * CDEK API Client (Stub)
 *
 * CDEK API v2: https://api-docs.cdek.ru/29923741.html
 * Auth: OAuth2 client_credentials
 * Base URL:
 *   - production: https://api.cdek.ru/v2
 *   - test: https://api.edu.cdek.ru/v2
 *
 * Test credentials (official):
 *   client_id: EMscd6r9JnFiQ3bLoyjJY6eM78JrJceI
 *   client_secret: PjLZkKBHEiLK3YsjtNrt3TGNG0ahs3kG
 */

import type { CdekConfig } from './types';

const CDEK_API_PROD = 'https://api.cdek.ru/v2';
const CDEK_API_TEST = 'https://api.edu.cdek.ru/v2';

// Official CDEK test credentials
const TEST_CLIENT_ID = 'EMscd6r9JnFiQ3bLoyjJY6eM78JrJceI';
const TEST_CLIENT_SECRET = 'PjLZkKBHEiLK3YsjtNrt3TGNG0ahs3kG';

export interface CdekTariff {
  tariff_code: number;
  tariff_name: string;
  tariff_description: string;
  delivery_mode: number; // 1=door-door, 2=door-office, 3=office-door, 4=office-office
  delivery_sum: number;
  period_min: number;
  period_max: number;
  calendar_min: number;
  calendar_max: number;
}

export interface CdekCalculateResult {
  tariffs: CdekTariff[];
  error?: string;
}

export class CdekClient {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private testMode: boolean;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(config: CdekConfig) {
    this.testMode = config.testMode ?? true;
    this.baseUrl = this.testMode ? CDEK_API_TEST : CDEK_API_PROD;
    this.clientId = config.clientId || TEST_CLIENT_ID;
    this.clientSecret = config.clientSecret || TEST_CLIENT_SECRET;
  }

  /**
   * Get OAuth2 token from CDEK API.
   */
  private async getToken(): Promise<string> {
    // Check cache
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    // In full stub mode (no real credentials), return mock
    if (!this.clientId || !this.clientSecret) {
      return 'mock_token';
    }

    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!res.ok) {
      console.error('[CDEK] Auth failed:', res.status);
      throw new Error(`CDEK auth failed: ${res.status}`);
    }

    const data = await res.json();
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };

    return data.access_token;
  }

  /**
   * Calculate delivery tariffs.
   *
   * @param fromCityCode - CDEK city code of sender
   * @param toCityCode - CDEK city code of receiver
   * @param packages - array of package dimensions
   * @param tariffCodes - specific tariffs to calculate (optional)
   */
  async calculateTariffs(params: {
    fromCityCode: number;
    toCityCode: number;
    packages: Array<{
      weight: number; // grams
      length?: number; // cm
      width?: number; // cm
      height?: number; // cm
    }>;
    tariffCodes?: number[];
  }): Promise<CdekCalculateResult> {
    // If no real credentials, return mock
    if (!this.clientId || this.clientId === TEST_CLIENT_ID) {
      if (this.testMode) {
        return this.mockCalculate(params);
      }
    }

    try {
      const token = await this.getToken();

      const body: Record<string, unknown> = {
        type: 1, // online store delivery
        from_location: { code: params.fromCityCode },
        to_location: { code: params.toCityCode },
        packages: params.packages.map((p, i) => ({
          weight: p.weight,
          length: p.length || 20,
          width: p.width || 20,
          height: p.height || 10,
          number: String(i + 1),
        })),
      };

      const url = params.tariffCodes
        ? `${this.baseUrl}/calculator/tariff`
        : `${this.baseUrl}/calculator/tarifflist`;

      // For single tariff, use /calculator/tariff
      if (params.tariffCodes && params.tariffCodes.length === 1) {
        body.tariff_code = params.tariffCodes[0];

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (data.errors) {
          return { tariffs: [], error: data.errors[0]?.message || 'CDEK calculation error' };
        }

        return {
          tariffs: [{
            tariff_code: params.tariffCodes[0],
            tariff_name: data.tariff_name || 'CDEK',
            tariff_description: data.tariff_description || '',
            delivery_mode: data.delivery_mode || 1,
            delivery_sum: data.delivery_sum || 0,
            period_min: data.period_min || 1,
            period_max: data.period_max || 5,
            calendar_min: data.calendar_min || 1,
            calendar_max: data.calendar_max || 7,
          }],
        };
      }

      // For multiple tariffs, use /calculator/tarifflist
      const res = await fetch(`${this.baseUrl}/calculator/tarifflist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.errors) {
        return { tariffs: [], error: data.errors[0]?.message || 'CDEK calculation error' };
      }

      const tariffs = (data.tariff_codes || []).map((t: Record<string, unknown>) => ({
        tariff_code: t.tariff_code,
        tariff_name: t.tariff_name || 'CDEK',
        tariff_description: t.tariff_description || '',
        delivery_mode: t.delivery_mode || 1,
        delivery_sum: t.delivery_sum || 0,
        period_min: t.period_min || 1,
        period_max: t.period_max || 5,
        calendar_min: t.calendar_min || 1,
        calendar_max: t.calendar_max || 7,
      }));

      // Filter by requested tariff codes if provided
      const filtered = params.tariffCodes
        ? tariffs.filter((t: CdekTariff) => params.tariffCodes!.includes(t.tariff_code))
        : tariffs;

      return { tariffs: filtered };
    } catch (error) {
      console.error('[CDEK] Calculate error:', error);
      return this.mockCalculate(params);
    }
  }

  /**
   * Search for CDEK city code by city name or postal code.
   */
  async findCity(query: string): Promise<Array<{ code: number; city: string; region: string }>> {
    try {
      const token = await this.getToken();

      // Try postal code first
      const isPostal = /^\d{5,6}$/.test(query.trim());
      const searchParam = isPostal ? `postal_code=${query.trim()}` : `city=${encodeURIComponent(query.trim())}`;

      const res = await fetch(`${this.baseUrl}/location/cities?${searchParam}&size=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      return (data || []).map((c: Record<string, unknown>) => ({
        code: c.code as number,
        city: c.city as string,
        region: c.region as string,
      }));
    } catch {
      return [];
    }
  }

  // --- Mock ---

  private mockCalculate(params: {
    fromCityCode: number;
    toCityCode: number;
    packages: Array<{ weight: number }>;
  }): CdekCalculateResult {
    const totalWeight = params.packages.reduce((s, p) => s + p.weight, 0);
    const basePrice = Math.round(200 + totalWeight / 10);

    return {
      tariffs: [
        {
          tariff_code: 136,
          tariff_name: 'Посылка склад-склад',
          tariff_description: 'Доставка до пункта выдачи СДЭК',
          delivery_mode: 4,
          delivery_sum: basePrice,
          period_min: 2,
          period_max: 5,
          calendar_min: 3,
          calendar_max: 7,
        },
        {
          tariff_code: 137,
          tariff_name: 'Посылка склад-дверь',
          tariff_description: 'Курьерская доставка СДЭК',
          delivery_mode: 3,
          delivery_sum: basePrice + 150,
          period_min: 2,
          period_max: 5,
          calendar_min: 3,
          calendar_max: 7,
        },
      ],
    };
  }
}

/**
 * Create CDEK client from tenant config.
 */
export function createCdekClient(config?: CdekConfig): CdekClient {
  return new CdekClient(config || {
    clientId: '',
    clientSecret: '',
    testMode: true,
    senderCityCode: 44,
    tariffCodes: [136, 137],
  });
}

/** Well-known CDEK tariff codes */
export const CDEK_TARIFFS = {
  /** Посылка склад-склад (до ПВЗ) */
  PARCEL_WAREHOUSE: 136,
  /** Посылка склад-дверь (курьер) */
  PARCEL_DOOR: 137,
  /** Экспресс склад-склад */
  EXPRESS_WAREHOUSE: 234,
  /** Экспресс склад-дверь */
  EXPRESS_DOOR: 233,
} as const;
