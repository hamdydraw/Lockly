import { Plug, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { StrengthMeter } from '../components/StrengthMeter';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassInput } from '../components/ui/GlassInput';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../auth/AuthProvider';
import { api, ApiError } from '../lib/api';
import { clearApiBase, getApiBase, isNative, serverOrigin } from '../lib/config';

export function SettingsPage() {
  const { session } = useAuth();
  const toast = useToast();
  const [newMaster, setNewMaster] = useState('');
  const [busy, setBusy] = useState(false);
  const apiBase = getApiBase();

  async function resetMaster(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.resetMaster(newMaster);
      setNewMaster('');
      toast('Master password updated', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Update failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Settings</h1>

      <GlassCard className="mb-4">
        <h2 className="mb-1 font-semibold">Account</h2>
        <p className="text-sm text-muted">{session?.email}</p>
      </GlassCard>

      {isNative && apiBase && (
        <GlassCard className="mb-4">
          <h2 className="mb-1 font-semibold">Server</h2>
          <p className="mb-4 break-all text-sm text-muted">{serverOrigin(apiBase)}</p>
          <GlassButton
            variant="ghost"
            onClick={() => {
              // Signs out locally and sends the app back to the setup screen.
              clearApiBase();
              window.location.reload();
            }}
          >
            <Plug className="h-4 w-4" />
            Change server
          </GlassButton>
        </GlassCard>
      )}

      <GlassCard>
        <h2 className="mb-1 font-semibold">Change master password</h2>
        <p className="mb-4 text-sm text-muted">
          Sets a new master password for unlocking your vault.
        </p>
        <form onSubmit={resetMaster} className="space-y-3">
          <GlassInput
            label="New master password"
            type="password"
            value={newMaster}
            onChange={(e) => setNewMaster(e.target.value)}
            placeholder="At least 10 characters"
            minLength={10}
            required
          />
          <StrengthMeter password={newMaster} />
          <GlassButton type="submit" disabled={busy}>
            {busy ? 'Updating…' : 'Update master password'}
          </GlassButton>
        </form>
      </GlassCard>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200/80">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          This build uses recoverable (server-side) encryption so a forgotten master password
          can be reset. For maximum security, a future zero-knowledge mode would remove the
          server's ability to decrypt — at the cost of recoverability.
        </p>
      </div>
    </div>
  );
}
