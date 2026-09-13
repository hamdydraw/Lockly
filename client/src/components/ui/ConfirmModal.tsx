import { AlertTriangle, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';
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
  const { t } = useI18n();
  const busy = confirm.busy || secondary?.busy || false;

  return (
    <GlassModal open={open} onClose={busy ? () => {} : onClose} title={title}>
      <div className="flex gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-danger/25 bg-danger/10">
          <AlertTriangle className="h-5 w-5 text-danger" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-fg-muted">{body}</div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-fg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('common.cancel')}
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
          ? 'bg-danger-solid text-fg-on-accent hover:bg-danger-solid/90 focus-visible:ring-danger active:scale-[0.98]'
          : 'border border-line bg-fg/[0.03] text-fg hover:bg-surface-3 focus-visible:ring-accent-fg active:scale-[0.98]')
      }
    >
      {action.busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
      {action.label}
    </button>
  );
}
