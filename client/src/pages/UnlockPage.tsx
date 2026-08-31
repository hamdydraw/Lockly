import { motion } from 'framer-motion';
import { KeyRound, LogOut, Unlock } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassInput } from '../components/ui/GlassInput';
import { useToast } from '../components/ui/Toast';
import { api, ApiError } from '../lib/api';

export function UnlockPage() {
  const { session, refresh, logout } = useAuth();
  const toast = useToast();
  const [masterPassword, setMasterPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.unlock(masterPassword);
      await refresh();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Unlock failed', 'error');
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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-glow to-cyan-glow shadow-glow-cyan">
            <KeyRound className="h-7 w-7 text-[#1a1035]" />
          </div>
          <h1 className="text-xl font-bold">Vault locked</h1>
          <p className="mt-1 text-sm text-muted">
            Enter your master password to unlock{session ? `, ${session.email}` : ''}.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3 text-left">
            <GlassInput
              type="password"
              autoFocus
              required
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="Master password"
            />
            <GlassButton type="submit" className="w-full" disabled={busy}>
              <Unlock className="h-4 w-4" />
              {busy ? 'Unlocking…' : 'Unlock'}
            </GlassButton>
          </form>

          <button
            className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
            onClick={() => logout()}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </GlassCard>
      </motion.div>
    </div>
  );
}
