import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { DIRECTUS_URL } from '@/lib/orchestrator/admin-client';
const DIRECTUS_TOKEN = () => process.env.DIRECTUS_ADMIN_TOKEN || '';

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
 * PATCH /api/admin/[slug]/reviews/[id]
 * Approve or reject a review.
 *
 * Body: { status: 'approved' | 'rejected', moderationNote?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const { status, moderationNote } = body as { status?: string; moderationNote?: string };

    const validStatuses = ['approved', 'rejected', 'pending'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 },
      );
    }

    // Verify tenant ownership
    const existing = await directusFetch(`/items/reviews/${id}`);
    if (!existing.data || existing.data.tenant_id !== slug) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    // Build update payload
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
    }

    if (moderationNote !== undefined) {
      updateData.moderation_note = moderationNote;
    }

    const updated = await directusFetch(`/items/reviews/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });

    console.log(`[Admin Reviews] Review #${id} → ${status} (tenant: ${slug})`);

    return NextResponse.json({
      success: true,
      item: updated.data,
    });
  } catch (error) {
    console.error('[Admin Review Update] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update review' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/[slug]/reviews/[id]
 * Delete a review permanently.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  try {
    // Verify tenant ownership
    const existing = await directusFetch(`/items/reviews/${id}`);
    if (!existing.data || existing.data.tenant_id !== slug) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    await directusFetch(`/items/reviews/${id}`, { method: 'DELETE' });

    console.log(`[Admin Reviews] Review #${id} deleted (tenant: ${slug})`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Review Delete] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete review' },
      { status: 500 },
    );
  }
}
