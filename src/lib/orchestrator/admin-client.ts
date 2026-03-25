import {
  createDirectus,
  rest,
  staticToken,
  createItem,
  createItems,
  readItems,
  readItem,
  updateItem,
  deleteItem,
  deleteItems,
  uploadFiles,
  importFile,
} from '@directus/sdk';

const DIRECTUS_URL =
  process.env.DIRECTUS_URL || process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';

/**
 * Returns an authenticated Directus admin client.
 * Uses static token auth (DIRECTUS_ADMIN_TOKEN).
 * Falls back to email/password login if no token is set.
 */
export async function getAdminClient() {
  const token = process.env.DIRECTUS_ADMIN_TOKEN;

  if (token) {
    return createDirectus(DIRECTUS_URL)
      .with(staticToken(token))
      .with(rest({
        onRequest: (options) => ({ ...options, cache: 'no-store' }),
      }));
  }

  // Fallback: email/password (legacy)
  const { authentication } = await import('@directus/sdk');
  const email = process.env.DIRECTUS_ADMIN_EMAIL;
  const password = process.env.DIRECTUS_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Either DIRECTUS_ADMIN_TOKEN or DIRECTUS_ADMIN_EMAIL+DIRECTUS_ADMIN_PASSWORD are required',
    );
  }

  const client = createDirectus(DIRECTUS_URL)
    .with(authentication('json'))
    .with(rest({
      onRequest: (options) => ({ ...options, cache: 'no-store' }),
    }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (client as any).login(email, password);
  return client;
}

export {
  DIRECTUS_URL,
  createItem,
  createItems,
  readItems,
  readItem,
  updateItem,
  deleteItem,
  deleteItems,
  uploadFiles,
  importFile,
};
