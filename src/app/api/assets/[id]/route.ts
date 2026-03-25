import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/assets/[id]
 * Proxies Directus file assets.
 * Requires: directus_files → Read permission for the Public role in Directus.
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolvedParams =
    context.params instanceof Promise ? await context.params : context.params;
  const { id } = resolvedParams;

  if (!id) {
    return new NextResponse('Missing asset id', { status: 400 });
  }

  const directusUrl =
    process.env.DIRECTUS_URL ||
    process.env.NEXT_PUBLIC_DIRECTUS_URL ||
    'http://localhost:8055';

  const searchParams = request.nextUrl.searchParams.toString();
  const assetUrl = `${directusUrl}/assets/${id}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const upstream = await fetch(assetUrl);

    if (!upstream.ok) {
      console.error(`[Assets] Directus returned ${upstream.status} for ${id}`);
      return new NextResponse(null, { status: upstream.status });
    }

    const contentType =
      upstream.headers.get('content-type') || 'application/octet-stream';
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    console.error('[Assets] Proxy error:', e);
    return new NextResponse(null, { status: 502 });
  }
}
