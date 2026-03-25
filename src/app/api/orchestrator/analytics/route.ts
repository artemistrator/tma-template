import { NextRequest, NextResponse } from 'next/server';
import { requireOrchestratorAuth } from '@/lib/orchestrator/auth';
import { getAnalytics, resetAnalytics } from '@/lib/orchestrator/analytics';

/**
 * GET /api/orchestrator/analytics
 *
 * Returns assembly statistics: total, success/failure, by appType, recent log.
 * Protected by ORCHESTRATOR_SECRET.
 */
export async function GET(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  const data = await getAnalytics();

  return NextResponse.json({
    success: true,
    ...data,
    successRate: data.totalAssemblies > 0
      ? Math.round((data.successCount / data.totalAssemblies) * 100)
      : 0,
  });
}

/**
 * DELETE /api/orchestrator/analytics
 *
 * Reset all analytics data. For testing only.
 */
export async function DELETE(request: NextRequest) {
  const authError = requireOrchestratorAuth(request);
  if (authError) return authError;

  await resetAnalytics();

  return NextResponse.json({ success: true, message: 'Analytics reset' });
}
