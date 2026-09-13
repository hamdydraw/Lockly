import { useCallback } from 'react';
import { ApiError } from '../lib/api';
import { useI18n } from './LanguageProvider';
import type { MessageKey } from './messages/en';

type Params = Record<string, string | number>;

interface ErrorRule {
  match: string | RegExp;
  key: MessageKey;
  params?: (m: RegExpMatchArray) => Params;
}

// Every English message the client can receive (contracts/error-translation.md).
// client/scripts/check-i18n.mjs fails when server/src or lib/api.ts adds one not listed here.
const ERROR_MAP: ErrorRule[] = [
  // server/src
  { match: 'Not authenticated', key: 'errors.notAuthenticated' },
  { match: 'Invalid or expired session', key: 'errors.sessionExpired' },
  { match: 'Session user not found', key: 'errors.sessionUserNotFound' },
  { match: 'Not found', key: 'errors.notFound' },
  { match: 'Validation failed', key: 'errors.validationFailed' },
  { match: 'Internal server error', key: 'errors.serverError' },
  { match: 'Too many attempts — please wait and try again', key: 'errors.rateLimited' },
  { match: 'Vault is locked — enter your master password', key: 'errors.vaultLocked' },
  { match: 'Registration is closed.', key: 'errors.registrationClosed' },
  { match: 'An account with that email already exists', key: 'errors.emailTaken' },
  { match: 'Invalid email or password', key: 'errors.invalidCredentials' },
  { match: 'Incorrect master password', key: 'errors.wrongMasterPassword' },
  { match: 'No file uploaded (use form field "file")', key: 'errors.noFileUploaded' },
  { match: 'File not found', key: 'errors.fileNotFound' },
  { match: 'File data not found', key: 'errors.fileDataNotFound' },
  { match: 'Item not found', key: 'errors.itemNotFound' },
  // client/src/lib/api.ts
  { match: 'No Lockly server configured', key: 'errors.noServer' },
  {
    match: "Can't reach the Lockly server. Check the address and that it's running.",
    key: 'errors.unreachable',
  },
  {
    match: /^Server responded (\d+)$/,
    key: 'errors.serverResponded',
    params: (m) => ({ status: Number(m[1]) }),
  },
  { match: 'That address is not a Lockly server', key: 'errors.notLockly' },
  { match: 'Upload failed', key: 'errors.uploadFailed' },
  { match: 'Upload failed: could not reach the server', key: 'errors.uploadUnreachable' },
  { match: 'Upload cancelled', key: 'errors.uploadCancelled' },
  { match: 'Upload timed out', key: 'errors.uploadTimedOut' },
  { match: 'Download failed', key: 'errors.downloadFailed' },
  { match: 'Could not load file', key: 'errors.loadFileFailed' },
];

export function errorKey(message: string): { key: MessageKey; params?: Params } | null {
  for (const rule of ERROR_MAP) {
    if (typeof rule.match === 'string') {
      if (rule.match === message) return { key: rule.key };
    } else {
      const m = message.match(rule.match);
      if (m) return { key: rule.key, params: rule.params?.(m) };
    }
  }
  return null;
}

/**
 * Translated text for a failed request: a known server/client message in the
 * active language, otherwise the caller's per-action fallback (never raw English).
 */
export function useErrorText(): (err: unknown, fallback: MessageKey) => string {
  const { t } = useI18n();
  return useCallback(
    (err: unknown, fallback: MessageKey) => {
      if (err instanceof ApiError) {
        const hit = errorKey(err.message);
        if (hit) return t(hit.key, hit.params);
      }
      return t(fallback);
    },
    [t],
  );
}
