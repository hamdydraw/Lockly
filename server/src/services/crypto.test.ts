import { beforeAll, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';

// Provide a valid root key before importing the module under test.
beforeAll(() => {
  process.env.DATA_ENCRYPTION_KEY ??= crypto.randomBytes(32).toString('base64');
  process.env.DATABASE_URL ??= 'file:./dev.db';
  process.env.JWT_SECRET ??= 'test-secret';
});

// Import lazily so env is set first.
const mod = await import('./crypto.js');

describe('AES-256-GCM seal/open', () => {
  it('round-trips a secret with the correct key', () => {
    const key = crypto.randomBytes(32);
    const sealed = mod.seal(Buffer.from('bank password: hunter2'), key);
    expect(mod.open(sealed, key).toString('utf8')).toBe('bank password: hunter2');
  });

  it('fails to decrypt with the wrong key', () => {
    const sealed = mod.seal(Buffer.from('secret'), crypto.randomBytes(32));
    expect(() => mod.open(sealed, crypto.randomBytes(32))).toThrow();
  });

  it('detects tampering via the auth tag', () => {
    const key = crypto.randomBytes(32);
    const sealed = mod.seal(Buffer.from('secret'), key);
    const tampered = { ...sealed, ciphertext: Buffer.from('evil').toString('base64') };
    expect(() => mod.open(tampered, key)).toThrow();
  });
});

describe('data key wrapping', () => {
  it('unwraps with the correct master password', () => {
    const dk = mod.generateDataKey();
    const salt = mod.generateSalt();
    const wrapped = mod.wrapWithMaster(dk, 'correct horse battery', salt);
    expect(mod.unwrapWithMaster(wrapped, 'correct horse battery', salt).equals(dk)).toBe(true);
  });

  it('rejects the wrong master password', () => {
    const dk = mod.generateDataKey();
    const salt = mod.generateSalt();
    const wrapped = mod.wrapWithMaster(dk, 'correct horse battery', salt);
    expect(() => mod.unwrapWithMaster(wrapped, 'wrong password', salt)).toThrow();
  });

  it('recovers the data key from the server-root escrow', () => {
    const dk = mod.generateDataKey();
    const wrapped = mod.wrapWithRoot(dk);
    expect(mod.unwrapWithRoot(wrapped).equals(dk)).toBe(true);
  });
});

describe('secret helpers', () => {
  it('encrypts and decrypts a UTF-8 secret with a data key', () => {
    const dk = mod.generateDataKey();
    const sealed = mod.encryptSecret('s3cr3t🔐', dk);
    expect(mod.decryptSecret(sealed, dk)).toBe('s3cr3t🔐');
  });
});
