import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';
import { AppShell } from './components/AppShell';
import { AuroraBackground } from './components/AuroraBackground';
import { useI18n } from './i18n/LanguageProvider';
import { getApiBase, isNative } from './lib/config';
import { AuthPage } from './pages/AuthPage';
import { FilesPage } from './pages/FilesPage';
import { ServerSetupPage } from './pages/ServerSetupPage';
import { SettingsPage } from './pages/SettingsPage';
import { UnlockPage } from './pages/UnlockPage';
import { VaultPage } from './pages/VaultPage';

export default function App() {
  const { session, loading, refresh } = useAuth();
  const { t } = useI18n();
  // Native builds have no server baked in; everything else is gated on picking one.
  const [apiBase, setApiBase] = useState(getApiBase);

  if (isNative && !apiBase) {
    return (
      <>
        <AuroraBackground />
        <ServerSetupPage
          onConnected={() => {
            setApiBase(getApiBase());
            void refresh();
          }}
        />
      </>
    );
  }

  return (
    <>
      <AuroraBackground />
      {loading ? (
        <div className="flex min-h-screen items-center justify-center text-fg-muted">
          {t('app.loading')}
        </div>
      ) : !session ? (
        <AuthPage />
      ) : !session.unlocked ? (
        <UnlockPage />
      ) : (
        <AppShell>
          <Routes>
            <Route path="/vault" element={<VaultPage />} />
            <Route path="/files" element={<FilesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/vault" replace />} />
          </Routes>
        </AppShell>
      )}
    </>
  );
}
