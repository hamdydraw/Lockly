import { Plug, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { StrengthMeter } from '../components/StrengthMeter';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassInput } from '../components/ui/GlassInput';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../auth/AuthProvider';
import { useErrorText } from '../i18n/errors';
import { useI18n } from '../i18n/LanguageProvider';
import { api } from '../lib/api';
import { clearApiBase, getApiBase, isNative, serverOrigin } from '../lib/config';

export function SettingsPage() {
  const { session } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
  const errorText = useErrorText();
  const [newMaster, setNewMaster] = useState('');
  const [busy, setBusy] = useState(false);
  const apiBase = getApiBase();

  async function resetMaster(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.resetMaster(newMaster);
      setNewMaster('');
      toast(t('settings.masterUpdated'), 'success');
    } catch (err) {
      toast(errorText(err, 'errors.updateFailed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">{t('settings.title')}</h1>

      <GlassCard className="mb-4">
        <h2 className="mb-1 font-semibold">{t('settings.appearance')}</h2>
        <p className="text-sm text-fg-muted">{t('settings.appearanceDescription')}</p>
        <ThemeToggle variant="labeled" className="mt-3" />
      </GlassCard>

      <GlassCard className="mb-4">
        <h2 className="mb-1 font-semibold">{t('language.label')}</h2>
        <p className="text-sm text-fg-muted">{t('language.description')}</p>
        <LanguageSwitcher className="mt-3" />
      </GlassCard>

      <GlassCard className="mb-4">
        <h2 className="mb-1 font-semibold">{t('settings.account')}</h2>
        <p dir="ltr" className="text-sm text-fg-muted rtl:text-right">
          {session?.email}
        </p>
      </GlassCard>

      {isNative && apiBase && (
        <GlassCard className="mb-4">
          <h2 className="mb-1 font-semibold">{t('settings.server')}</h2>
          <p dir="ltr" className="mb-4 break-all text-sm text-fg-muted rtl:text-right">
            {serverOrigin(apiBase)}
          </p>
          <GlassButton
            variant="ghost"
            onClick={() => {
              // Signs out locally and sends the app back to the setup screen.
              clearApiBase();
              window.location.reload();
            }}
          >
            <Plug className="h-4 w-4" />
            {t('settings.changeServer')}
          </GlassButton>
        </GlassCard>
      )}

      <GlassCard>
        <h2 className="mb-1 font-semibold">{t('settings.changeMaster')}</h2>
        <p className="mb-4 text-sm text-fg-muted">{t('settings.changeMasterDescription')}</p>
        <form onSubmit={resetMaster} className="space-y-3">
          <GlassInput
            label={t('settings.newMaster')}
            type="password"
            dir="ltr"
            className="rtl:text-right"
            value={newMaster}
            onChange={(e) => setNewMaster(e.target.value)}
            placeholder={t('auth.masterPlaceholder')}
            minLength={10}
            required
          />
          <StrengthMeter password={newMaster} />
          <GlassButton type="submit" disabled={busy}>
            {busy ? t('settings.updating') : t('settings.updateMaster')}
          </GlassButton>
        </form>
      </GlassCard>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/25 bg-warning/10 p-3 text-xs text-warning">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{t('settings.recoverableWarning')}</p>
      </div>
    </div>
  );
}
