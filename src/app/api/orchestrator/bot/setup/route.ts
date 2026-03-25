import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { createRateLimiter } from '@/lib/rate-limit';

const limiter = createRateLimiter({ limit: 10, windowMs: 3_600_000, prefix: 'bot-setup' });

const BotSetupSchema = z.object({
  botToken: z.string().min(10, 'Bot token is required'),
  /** URL of the Mini App (e.g. https://pizza.example.com or https://example.com/?tenant=pizza) */
  webAppUrl: z.string().url('Must be a valid URL'),
  /** Menu button text shown in the bot */
  menuButtonText: z.string().default('Open App'),
  /** Optional: set bot description */
  description: z.string().optional(),
  /** Optional: set bot short description (about) */
  shortDescription: z.string().optional(),
});

/**
 * POST /api/orchestrator/bot/setup
 *
 * Configures a Telegram bot to serve the Mini App:
 * 1. Sets the Menu Button → web_app URL
 * 2. Optionally sets bot description / about text
 *
 * Note: Bot creation in BotFather is still manual.
 * This endpoint automates everything AFTER you have the bot token.
 */
export async function POST(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const validation = BotSetupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.issues },
        { status: 400 },
      );
    }

    const { botToken, webAppUrl, menuButtonText, description, shortDescription } = validation.data;
    const tgApi = `https://api.telegram.org/bot${botToken}`;

    const results: Array<{ action: string; success: boolean; error?: string }> = [];

    // 1. Verify bot token by calling getMe
    const meRes = await fetch(`${tgApi}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
      return NextResponse.json(
        { success: false, error: 'Invalid bot token', details: meData.description },
        { status: 400 },
      );
    }

    const botUsername = meData.result.username;
    results.push({ action: 'verify_token', success: true });

    // 2. Set Menu Button (setChatMenuButton for default)
    const menuRes = await fetch(`${tgApi}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: menuButtonText,
          web_app: { url: webAppUrl },
        },
      }),
    });
    const menuData = await menuRes.json();
    results.push({
      action: 'set_menu_button',
      success: menuData.ok,
      error: menuData.ok ? undefined : menuData.description,
    });

    // 3. Set bot description (optional)
    if (description) {
      const descRes = await fetch(`${tgApi}/setMyDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const descData = await descRes.json();
      results.push({
        action: 'set_description',
        success: descData.ok,
        error: descData.ok ? undefined : descData.description,
      });
    }

    // 4. Set short description / about (optional)
    if (shortDescription) {
      const aboutRes = await fetch(`${tgApi}/setMyShortDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_description: shortDescription }),
      });
      const aboutData = await aboutRes.json();
      results.push({
        action: 'set_short_description',
        success: aboutData.ok,
        error: aboutData.ok ? undefined : aboutData.description,
      });
    }

    const allOk = results.every((r) => r.success);

    return NextResponse.json({
      success: allOk,
      botUsername,
      webAppUrl,
      tMeLink: `https://t.me/${botUsername}`,
      results,
    });
  } catch (error) {
    console.error('[Bot Setup] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
