/**
 * AES-256-GCM encryption for tenant secrets.
 *
 * Encrypts sensitive values (YooKassa secretKey, CDEK clientSecret)
 * before storing in Directus. Decrypts when reading server-side.
 *
 * Encrypted values are prefixed with "enc:" to distinguish from plaintext.
 * If ENCRYPTION_KEY is not set, values are stored/returned as plaintext
 * (graceful degradation for development).
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const PREFIX = 'enc:';

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  // Derive a 32-byte key from the env variable using scrypt
  return scryptSync(raw, 'tma-platform-salt', 32);
}

/**
 * Encrypt a plaintext string.
 * Returns prefixed ciphertext: "enc:<iv>:<authTag>:<ciphertext>" (all hex).
 * If ENCRYPTION_KEY is not set, returns the value as-is.
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = getKey();
  if (!key) return plaintext;

  // Don't double-encrypt
  if (plaintext.startsWith(PREFIX)) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${PREFIX}${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted string.
 * If the value doesn't have the "enc:" prefix, returns as-is (plaintext fallback).
 * If ENCRYPTION_KEY is not set, returns as-is.
 */
export function decryptSecret(ciphertext: string): string {
  if (!ciphertext) return ciphertext;
  if (!ciphertext.startsWith(PREFIX)) return ciphertext; // plaintext fallback

  const key = getKey();
  if (!key) {
    console.warn('[Crypto] ENCRYPTION_KEY not set, cannot decrypt. Returning raw value.');
    return ciphertext;
  }

  try {
    const payload = ciphertext.slice(PREFIX.length);
    const [ivHex, authTagHex, encrypted] = payload.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error);
    return '';
  }
}

/**
 * Check if a value is encrypted.
 */
export function isEncrypted(value: string): boolean {
  return value?.startsWith(PREFIX) || false;
}

/**
 * Mask a secret for display (e.g. in admin settings).
 * Shows first 4 and last 4 chars: "test_XXXX...XXXX"
 */
export function maskSecret(value: string): string {
  if (!value) return '';
  // Decrypt first if encrypted
  const plain = decryptSecret(value);
  if (!plain || plain.length <= 8) return '****';
  return `${plain.slice(0, 4)}...${plain.slice(-4)}`;
}

/**
 * Encrypt specific secret fields in a tenant config object (in-place).
 * Call before saving to Directus.
 */
export function encryptConfigSecrets(config: Record<string, unknown>): void {
  // YooKassa secretKey
  const payments = config.payments as Record<string, unknown> | undefined;
  if (payments?.yookassa) {
    const yk = payments.yookassa as Record<string, unknown>;
    if (yk.secretKey && typeof yk.secretKey === 'string') {
      yk.secretKey = encryptSecret(yk.secretKey);
    }
  }

  // CDEK clientSecret
  const delivery = config.delivery as Record<string, unknown> | undefined;
  if (delivery?.cdek) {
    const cdek = delivery.cdek as Record<string, unknown>;
    if (cdek.clientSecret && typeof cdek.clientSecret === 'string') {
      cdek.clientSecret = encryptSecret(cdek.clientSecret);
    }
  }
}

/**
 * Decrypt specific secret fields in a tenant config object (returns new object).
 * Call after reading from Directus, before using secrets server-side.
 */
export function decryptConfigSecrets<T extends Record<string, unknown>>(config: T): T {
  const result = JSON.parse(JSON.stringify(config)) as T;

  // YooKassa secretKey
  const payments = (result as Record<string, unknown>).payments as Record<string, unknown> | undefined;
  if (payments?.yookassa) {
    const yk = payments.yookassa as Record<string, unknown>;
    if (yk.secretKey && typeof yk.secretKey === 'string') {
      yk.secretKey = decryptSecret(yk.secretKey);
    }
  }

  // CDEK clientSecret
  const delivery = (result as Record<string, unknown>).delivery as Record<string, unknown> | undefined;
  if (delivery?.cdek) {
    const cdek = delivery.cdek as Record<string, unknown>;
    if (cdek.clientSecret && typeof cdek.clientSecret === 'string') {
      cdek.clientSecret = decryptSecret(cdek.clientSecret);
    }
  }

  return result;
}
