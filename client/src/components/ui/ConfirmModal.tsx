import { AlertTriangle, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { GlassModal } from './GlassModal';

interface ConfirmAction {
  label: string;
  onClick: () => void;
  /** Shows a spinner in place of the label and blocks every button. */
  busy?: boolean;
}

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** What is about to happen, and to what. */
  body: ReactNode;
  confirm: ConfirmAction;
  /** A second, less destructive way out (e.g. "keep the files"). */
  secondary?: ConfirmAction;
}

/**
 * Confirmation for a destructive, irreversible action. Nothing here can be
 * undone — deleted blobs are gone — so the confirm button is never the one
 * focused by default and stays disabled while the request is in flight.
 */
export function ConfirmModal({ open, onClose, title, body, confirm, secondary }: ConfirmModalProps) {
  const busy = confirm.busy || secondary?.busy || false;

  return (
    <GlassModal open={open} onClose={busy ? () => {} : onClose} title={title}>
      <div className="flex gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-400/25 bg-red-400/[0.08]">
          <AlertTriangle className="h-5 w-5 text-red-400" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-muted">{body}</div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition-colors duration-150 hover:bg-white/[0.06] hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-glow disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        {secondary && <ActionButton action={secondary} busy={busy} tone="neutral" />}
        <ActionButton action={confirm} busy={busy} tone="danger" />
      </div>
    </GlassModal>
  );
}

function ActionButton({
  action,
  busy,
  tone,
}: {
  action: ConfirmAction;
  busy: boolean;
  tone: 'danger' | 'neutral';
}) {
  return (
    <button
      onClick={action.onClick}
      disabled={busy}
      className={
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ' +
        (tone === 'danger'
          ? 'bg-red-500/90 text-white hover:bg-red-500 focus-visible:ring-red-400 active:scale-[0.98]'
          : 'border border-line bg-white/[0.04] text-ink hover:bg-white/[0.09] focus-visible:ring-cyan-glow active:scale-[0.98]')
      }
    >
      {action.busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
      {action.label}
    </button>
  );
}
