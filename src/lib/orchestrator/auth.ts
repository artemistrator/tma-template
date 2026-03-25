import { NextRequest, NextResponse } from 'next/server';

const ORCHESTRATOR_SECRET = process.env.ORCHESTRATOR_SECRET;

/**
 * Verify that the request carries a valid orchestrator secret.
 * Expected header: `Authorization: Bearer <ORCHESTRATOR_SECRET>`
 *
 * Returns `null` when the request is authorized, or a 401/403 NextResponse otherwise.
 */
export function requireOrchestratorAuth(request: NextRequest): NextResponse | null {
  if (!ORCHESTRATOR_SECRET) {
    return NextResponse.json(
      { success: false, error: 'ORCHESTRATOR_SECRET is not configured on the server' },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json(
      { success: false, error: 'Missing Authorization header' },
      { status: 401 },
    );
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || token !== ORCHESTRATOR_SECRET) {
    return NextResponse.json(
      { success: false, error: 'Invalid orchestrator secret' },
      { status: 403 },
    );
  }

  return null; // authorized
}
