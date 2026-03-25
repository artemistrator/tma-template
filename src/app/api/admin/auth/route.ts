import { NextRequest, NextResponse } from 'next/server';
import {
  validateTelegramInitData,
  findAdminByTelegram,
  findAdminByToken,
  createSessionToken,
} from '@/lib/admin/auth';
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter({ limit: 20, windowMs: 60_000, prefix: 'admin-auth' });

/**
 * POST /api/admin/auth
 *
 * Authenticate an admin user. Supports two methods:
 * 1. Telegram initData (primary)
 * 2. Admin token (fallback for desktop)
 *
 * Body: { slug: string, initData?: string, adminToken?: string }
 * Returns: { success, token, admin: { name, role, slug } }
 */
export async function POST(request: NextRequest) {
  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const { slug, initData, adminToken } = body as {
      slug?: string;
      initData?: string;
      adminToken?: string;
    };

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Missing slug' },
        { status: 400 },
      );
    }

    // Method 1: Telegram initData
    if (initData) {
      const telegramUser = validateTelegramInitData(initData);
      if (!telegramUser) {
        return NextResponse.json(
          { success: false, error: 'Invalid Telegram initData' },
          { status: 401 },
        );
      }

      const admin = await findAdminByTelegram(telegramUser.id, slug);
      if (!admin) {
        return NextResponse.json(
          { success: false, error: 'You are not an admin for this tenant' },
          { status: 403 },
        );
      }

      const token = createSessionToken({
        telegramId: telegramUser.id,
        slug,
        role: admin.role as 'owner' | 'manager',
        name: admin.name,
      });

      return NextResponse.json({
        success: true,
        token,
        admin: {
          name: admin.name,
          role: admin.role,
          slug,
          telegramId: telegramUser.id,
        },
      });
    }

    // Method 2: Admin token (fallback)
    if (adminToken) {
      const admin = await findAdminByToken(adminToken, slug);
      if (!admin) {
        return NextResponse.json(
          { success: false, error: 'Invalid admin token' },
          { status: 401 },
        );
      }

      const token = createSessionToken({
        telegramId: admin.telegram_id,
        slug,
        role: admin.role as 'owner' | 'manager',
        name: admin.name,
      });

      return NextResponse.json({
        success: true,
        token,
        admin: {
          name: admin.name,
          role: admin.role,
          slug,
          telegramId: admin.telegram_id,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Provide either initData or adminToken' },
      { status: 400 },
    );
  } catch (error) {
    console.error('[Admin Auth] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 },
    );
  }
}
