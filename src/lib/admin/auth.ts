/**
 * Admin Authentication Library
 *
 * Supports two auth methods:
 * 1. Telegram WebApp initData (primary — for TMA context)
 * 2. Admin token (fallback — for desktop browser)
 *
 * JWT-like tokens are signed with HMAC-SHA256 using ORCHESTRATOR_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { DIRECTUS_URL } from '@/lib/orchestrator/admin-client';

const DIRECTUS_TOKEN = () => process.env.DIRECTUS_ADMIN_TOKEN || '';
const JWT_SECRET = () => process.env.ORCHESTRATOR_SECRET || 'dev-admin-secret';
const TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AdminSession {
  telegramId: number;
  slug: string;
  role: 'owner' | 'manager';
  name: string;
  iat: number;
  exp: number;
}

export interface TenantAdmin {
  id: number | string;
  tenant_id: string;
  telegram_id: number;
  admin_token: string;
  role: 'owner' | 'manager';
  name: string;
  created_at?: string;
}

// ─── Directus helpers ───────────────────────────────────────────────────────

async function directusFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${DIRECTUS_TOKEN()}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });
  return res.json();
}

/**
 * Find admin record by telegram_id + tenant slug
 */
export async function findAdminByTelegram(telegramId: number, slug: string): Promise<TenantAdmin | null> {
  try {
    const res = await directusFetch(
      `/items/tenant_admins?filter[telegram_id][_eq]=${telegramId}&filter[tenant_id][_eq]=${encodeURIComponent(slug)}&limit=1`
    );
    return (res.data || [])[0] || null;
  } catch {
    return null;
  }
}

/**
 * Find admin record by admin_token
 */
export async function findAdminByToken(adminToken: string, slug: string): Promise<TenantAdmin | null> {
  try {
    const res = await directusFetch(
      `/items/tenant_admins?filter[admin_token][_eq]=${encodeURIComponent(adminToken)}&filter[tenant_id][_eq]=${encodeURIComponent(slug)}&limit=1`
    );
    return (res.data || [])[0] || null;
  } catch {
    return null;
  }
}

/**
 * Create a new admin record
 */
export async function createTenantAdmin(data: {
  tenant_id: string;
  telegram_id: number;
  role: 'owner' | 'manager';
  name: string;
}): Promise<TenantAdmin | null> {
  try {
    const adminToken = crypto.randomUUID();
    const res = await directusFetch('/items/tenant_admins', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        admin_token: adminToken,
      }),
    });
    return res.data || null;
  } catch (error) {
    console.error('[Admin] Failed to create tenant admin:', error);
    return null;
  }
}

// ─── Telegram initData validation ───────────────────────────────────────────

/**
 * Validate Telegram WebApp initData.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Returns parsed user data if valid, null if invalid.
 */
export function validateTelegramInitData(initData: string): { id: number; first_name: string; last_name?: string; username?: string } | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !initData) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    // Build data-check-string: sort params (excluding hash), join with \n
    params.delete('hash');
    const entries = Array.from(params.entries());
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    // secret_key = HMAC-SHA256("WebAppData", bot_token)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // computed_hash = HMAC-SHA256(data_check_string, secret_key)
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) return null;

    // Check auth_date is not too old (allow 24 hours)
    const authDate = parseInt(params.get('auth_date') || '0');
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) return null;

    // Parse user data
    const userStr = params.get('user');
    if (!userStr) return null;

    const user = JSON.parse(userStr);
    if (!user.id) return null;

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
    };
  } catch {
    return null;
  }
}

// ─── JWT-like token management ──────────────────────────────────────────────

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString();
}

/**
 * Create a signed admin session token
 */
export function createSessionToken(session: Omit<AdminSession, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSession = {
    ...session,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const payloadStr = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET())
    .update(payloadStr)
    .digest('base64url');

  return `${payloadStr}.${signature}`;
}

/**
 * Verify and decode an admin session token
 */
export function verifySessionToken(token: string): AdminSession | null {
  try {
    const [payloadStr, signature] = token.split('.');
    if (!payloadStr || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET())
      .update(payloadStr)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const payload: AdminSession = JSON.parse(base64UrlDecode(payloadStr));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

// ─── Middleware helper ──────────────────────────────────────────────────────

/**
 * Verify admin auth from request.
 * Expects: Authorization: Bearer <session_token>
 *
 * Returns the admin session if valid, or a NextResponse error otherwise.
 */
export function requireAdminAuth(
  request: NextRequest,
  slug: string,
): { session: AdminSession } | { error: NextResponse } {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Missing Authorization header' },
        { status: 401 },
      ),
    };
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Invalid Authorization format' },
        { status: 401 },
      ),
    };
  }

  const session = verifySessionToken(token);
  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Invalid or expired session token' },
        { status: 401 },
      ),
    };
  }

  // Verify the session is for the correct tenant
  if (session.slug !== slug) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Access denied for this tenant' },
        { status: 403 },
      ),
    };
  }

  return { session };
}
