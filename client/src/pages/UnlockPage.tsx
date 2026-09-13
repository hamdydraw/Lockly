import { motion } from 'framer-motion';
import { KeyRound, LogOut, Unlock } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassInput } from '../components/ui/GlassInput';
import { useToast } from '../components/ui/Toast';
import { useErrorText } from '../i18n/errors';
import { useI18n } from '../i18n/LanguageProvider';
import { api } from '../lib/api';

export function UnlockPage() {
  const { session, refresh, logout } = useAuth();
  const toast = useToast();
  const { t, tx } = useI18n();
  const errorText = useErrorText();
  const [masterPassword, setMasterPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.unlock(masterPassword);
      await refresh();
    } catch (err) {
      toast(errorText(err, 'errors.unlockFailed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <GlassCard strong className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secure/10">
            <KeyRound className="h-7 w-7 text-secure" />
          </div>
          <h1 className="text-xl font-bold">{t('unlock.title')}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {session
              ? tx('unlock.promptWithEmail', { email: <bdi dir="ltr">{session.email}</bdi> })
              : t('unlock.prompt')}
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3 text-start">
            <GlassInput
              type="password"
              dir="ltr"
              className="rtl:text-right"
              autoFocus
              required
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder={t('unlock.placeholder')}
            />
            <GlassButton type="submit" className="w-full" disabled={busy}>
              <Unlock className="h-4 w-4" />
              {busy ? t('unlock.unlocking') : t('unlock.unlock')}
            </GlassButton>
          </form>

          <button
            className="mt-5 inline-flex items-center gap-1.5 text-sm text-fg-muted transition hover:text-fg"
            onClick={() => logout()}
          >
            <LogOut className="h-3.5 w-3.5 rtl:-scale-x-100" />
            {t('common.signOut')}
          </button>
        </GlassCard>
      </motion.div>
    </div>
  );
}
