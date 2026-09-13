import { motion } from 'framer-motion';
import { Plug, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassInput } from '../components/ui/GlassInput';
import { Logo } from '../components/ui/Logo';
import { useErrorText } from '../i18n/errors';
import { useI18n } from '../i18n/LanguageProvider';
import { api } from '../lib/api';
import { isInsecure, normalizeServerUrl, setApiBase } from '../lib/config';

/**
 * Shown on Android before anything else: the app ships without a server baked
 * in, so the user points it at their own Lockly instance once and we remember.
 */
export function ServerSetupPage({ onConnected }: { onConnected: () => void }) {
  const { t, tx } = useI18n();
  const errorText = useErrorText();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = normalizeServerUrl(url);
  const warnInsecure = normalized !== '' && isInsecure(normalized);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Verify it's actually reachable and actually Lockly before saving it,
      // so a typo surfaces here instead of as a login failure later.
      await api.health(normalized);
      setApiBase(normalized);
      onConnected();
    } catch (err) {
      setError(errorText(err, 'errors.addressUnreachable'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <GlassCard strong>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex justify-center">
              <Logo size={56} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">{t('serverSetup.title')}</h1>
            <p className="mt-1 text-sm text-fg-muted">{t('serverSetup.description')}</p>
          </div>

          <form onSubmit={connect} className="space-y-3">
            {/* Addresses always read left to right. */}
            <GlassInput
              label={t('serverSetup.addressLabel')}
              type="url"
              dir="ltr"
              className="rtl:text-right"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="192.168.1.20:4000"
            />
            {normalized && (
              <p className="text-xs text-fg-muted">
                {tx('serverSetup.willConnect', {
                  address: (
                    <span dir="ltr" className="text-fg">
                      {normalized}
                    </span>
                  ),
                })}
              </p>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}

            <GlassButton type="submit" className="mt-2 w-full" disabled={busy || !url.trim()}>
              <Plug className="h-4 w-4" />
              {busy ? t('common.connecting') : t('common.connect')}
            </GlassButton>
          </form>

          {warnInsecure && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-warning/25 bg-warning/10 p-3 text-xs text-warning">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {tx('serverSetup.insecureWarning', {
                  http: (
                    <span dir="ltr" className="font-semibold">
                      http://
                    </span>
                  ),
                  https: (
                    <span dir="ltr" className="font-semibold">
                      https://
                    </span>
                  ),
                })}
              </p>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
