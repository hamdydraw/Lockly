import crypto from 'node:crypto';
import { env } from '../env.js';

/**
 * Crypto model (server-side, recoverable — per the user's choice):
 *
 *  - Each user has a random 256-bit Data Key (DK) that encrypts all their
 *    vault-item secrets and files with AES-256-GCM.
 *  - DK is wrapped twice:
 *      (1) with a key derived from the user's MASTER password  -> `wrappedDataKey`
 *          (the normal unlock path; a wrong master password fails GCM auth)
 *      (2) with the server root key from env DATA_ENCRYPTION_KEY -> `recoveryKey`
 *          (escrow, so an admin/login-based reset can recover data)
 *
 * This means the server *can* decrypt data (needed for recovery). The master
 * password still cryptographically gates the normal unlock path.
 */

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // 96-bit nonce, recommended for GCM
const KEY_LEN = 32; // 256-bit

/** The server root key (32 bytes) decoded from env. */
function rootKey(): Buffer {
  const key = Buffer.from(env.DATA_ENCRYPTION_KEY, 'base64');
  if (key.length !== KEY_LEN) {
    throw new Error(
      `DATA_ENCRYPTION_KEY must decode to ${KEY_LEN} bytes (got ${key.length}). ` +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
    );
  }
  return key;
}

export interface Sealed {
  iv: string; // base64
  authTag: string; // base64
  ciphertext: string; // base64
}

/** Encrypt bytes with a 32-byte key using AES-256-GCM. */
export function seal(plaintext: Buffer, key: Buffer): Sealed {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

/** Decrypt a Sealed payload. Throws if the key is wrong or data was tampered with. */
export function open(sealed: Sealed, key: Buffer): Buffer {
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(sealed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(sealed.authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(sealed.ciphertext, 'base64')),
    decipher.final(),
  ]);
}

/** Pack a Sealed payload into one string "iv.authTag.ciphertext" for single-column storage. */
export function pack(s: Sealed): string {
  return `${s.iv}.${s.authTag}.${s.ciphertext}`;
}

export function unpack(packed: string): Sealed {
  const [iv, authTag, ciphertext] = packed.split('.');
  if (!iv || !authTag || ciphertext === undefined) {
    throw new Error('Malformed sealed payload');
  }
  return { iv, authTag, ciphertext };
}

/** Derive a 32-byte key from a password + salt using scrypt (dependency-free KDF). */
export function deriveKey(password: string, salt: Buffer): Buffer {
  // N=2^15 needs ~32MB; bump maxmem above the default cap to allow it.
  return crypto.scryptSync(password, salt, KEY_LEN, {
    N: 2 ** 15,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
}

// ---- Key lifecycle helpers ----

export function generateDataKey(): Buffer {
  return crypto.randomBytes(KEY_LEN);
}

export function generateSalt(): Buffer {
  return crypto.randomBytes(16);
}

/** Wrap (encrypt) the DK with a master-password-derived key. Returns packed string. */
export function wrapWithMaster(dataKey: Buffer, masterPassword: string, salt: Buffer): string {
  const kek = deriveKey(masterPassword, salt);
  return pack(seal(dataKey, kek));
}

/** Unwrap the DK using the master password. Throws if the password is wrong. */
export function unwrapWithMaster(
  wrapped: string,
  masterPassword: string,
  salt: Buffer,
): Buffer {
  const kek = deriveKey(masterPassword, salt);
  return open(unpack(wrapped), kek);
}

/** Wrap the DK with the server root key (recovery escrow). */
export function wrapWithRoot(dataKey: Buffer): string {
  return pack(seal(dataKey, rootKey()));
}

/** Unwrap the DK using the server root key (used during reset/recovery). */
export function unwrapWithRoot(wrapped: string): Buffer {
  return open(unpack(wrapped), rootKey());
}

// ---- Item/file secret encryption (using a user's DK) ----

/** Encrypt a UTF-8 secret string with the user's data key. */
export function encryptSecret(plaintext: string, dataKey: Buffer): Sealed {
  return seal(Buffer.from(plaintext, 'utf8'), dataKey);
}

/** Decrypt a secret back to a UTF-8 string. */
export function decryptSecret(sealed: Sealed, dataKey: Buffer): string {
  return open(sealed, dataKey).toString('utf8');
}
