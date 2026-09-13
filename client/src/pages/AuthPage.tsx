import { motion } from 'framer-motion';
import { Lock, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassInput } from '../components/ui/GlassInput';
import { useToast } from '../components/ui/Toast';
import { useErrorText } from '../i18n/errors';
import { useI18n } from '../i18n/LanguageProvider';
import { api } from '../lib/api';
import { StrengthMeter } from '../components/StrengthMeter';
import { Logo } from '../components/ui/Logo';

export function AuthPage() {
  const { refresh } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
  const errorText = useErrorText();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'register') {
        await api.register(email, password, masterPassword);
      } else {
        await api.login(email, password);
      }
      await refresh();
    } catch (err) {
      toast(errorText(err, 'errors.generic'), 'error');
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
            <h1 className="text-2xl font-extrabold tracking-tight">Lockly</h1>
            <p className="mt-1 text-sm text-fg-muted">
              {mode === 'login' ? t('auth.welcomeBack') : t('auth.createVault')}
            </p>
          </div>

          {/* Emails and passwords always read left to right, even in Arabic. */}
          <form onSubmit={submit} className="space-y-3">
            <GlassInput
              label={t('auth.email')}
              type="email"
              dir="ltr"
              className="rtl:text-right"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <GlassInput
              label={mode === 'register' ? t('auth.loginPassword') : t('auth.password')}
              type="password"
              dir="ltr"
              className="rtl:text-right"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {mode === 'register' && (
              <div>
                <GlassInput
                  label={t('auth.masterPasswordEncrypts')}
                  type="password"
                  dir="ltr"
                  className="rtl:text-right"
                  autoComplete="new-password"
                  required
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder={t('auth.masterPlaceholder')}
                />
                <StrengthMeter password={masterPassword} />
              </div>
            )}

            <GlassButton type="submit" className="mt-2 w-full" disabled={busy}>
              {mode === 'login' ? <Lock className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {busy ? t('common.pleaseWait') : mode === 'login' ? t('auth.signIn') : t('auth.createAccount')}
            </GlassButton>
          </form>

          <button
            className="mt-5 w-full text-center text-sm text-fg-muted transition hover:text-fg"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}
          </button>
        </GlassCard>
      </motion.div>
    </div>
  );
}
