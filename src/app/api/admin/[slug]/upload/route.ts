import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/admin/auth';
import { DIRECTUS_URL } from '@/lib/orchestrator/admin-client';

const DIRECTUS_TOKEN = () => process.env.DIRECTUS_ADMIN_TOKEN || '';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/admin/[slug]/upload
 * Upload an image file to Directus assets.
 * Accepts multipart/form-data with a "file" field.
 * Returns { success, assetId, url }.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const auth = requireAdminAuth(request, slug);
  if ('error' in auth) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File exceeds 5MB limit' },
        { status: 413 },
      );
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only JPEG, PNG, WebP, GIF images are allowed' },
        { status: 400 },
      );
    }

    // Forward to Directus
    const directusForm = new FormData();
    directusForm.append('file', file, file.name);

    const res = await fetch(`${DIRECTUS_URL}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIRECTUS_TOKEN()}`,
      },
      body: directusForm,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Admin Upload] Directus error:', errText);
      return NextResponse.json(
        { success: false, error: 'Upload to storage failed' },
        { status: 500 },
      );
    }

    const data = await res.json();
    const assetId = data.data?.id;

    return NextResponse.json({
      success: true,
      assetId,
      url: `/api/assets/${assetId}`,
    });
  } catch (error) {
    console.error('[Admin Upload] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 },
    );
  }
}
