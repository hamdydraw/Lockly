import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, EyeOff, Trash2, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useErrorText } from '../i18n/errors';
import { useI18n } from '../i18n/LanguageProvider';
import { api } from '../lib/api';
import { copyText } from '../lib/clipboard';
import type { ItemInput, ItemType } from '../lib/types';
import { PasswordGenerator } from './PasswordGenerator';
import { StrengthMeter } from './StrengthMeter';
import { GlassButton } from './ui/GlassButton';
import { GlassInput } from './ui/GlassInput';
import { GlassModal } from './ui/GlassModal';
import { useToast } from './ui/Toast';

const TYPES: ItemType[] = ['LOGIN', 'CARD', 'SECURE_NOTE', 'OTHER'];

interface Props {
  open: boolean;
  onClose: () => void;
  itemId?: string; // undefined = create
}

const EMPTY: ItemInput = {
  type: 'LOGIN',
  title: '',
  folder: '',
  username: '',
  url: '',
  secret: { password: '', notes: '' },
};

export function ItemModal({ open, onClose, itemId }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const { t } = useI18n();
  const errorText = useErrorText();
  const [form, setForm] = useState<ItemInput>(EMPTY);
  const [reveal, setReveal] = useState(false);
  const [showGen, setShowGen] = useState(false);

  const editing = Boolean(itemId);

  const { data: existing } = useQuery({
    queryKey: ['item', itemId],
    queryFn: () => api.getItem(itemId!),
    enabled: open && editing,
  });

  useEffect(() => {
    if (!open) return;
    if (editing && existing) {
      setForm({
        type: existing.type,
        title: existing.title,
        folder: existing.folder ?? '',
        username: existing.username ?? '',
        url: existing.url ?? '',
        secret: { password: '', notes: '', ...existing.secret },
      });
    } else if (!editing) {
      setForm(EMPTY);
    }
    setReveal(false);
    setShowGen(false);
  }, [open, editing, existing]);

  const save = useMutation({
    mutationFn: async () => {
      if (editing) await api.updateItem(itemId!, form);
      else await api.createItem(form);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['items'] });
      if (itemId) await qc.invalidateQueries({ queryKey: ['item', itemId] });
      toast(editing ? t('item.updated') : t('item.saved'), 'success');
      onClose();
    },
    onError: (err) => toast(errorText(err, 'errors.saveFailed'), 'error'),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteItem(itemId!),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['items'] });
      toast(t('item.deleted'), 'success');
      onClose();
    },
  });

  async function copyPassword() {
    const pw = form.secret.password ?? '';
    if (!pw) return;
    if (!(await copyText(pw))) {
      toast(t('errors.clipboard'), 'error');
      return;
    }
    toast(t('item.copied'), 'info');
    // Auto-clear clipboard after 20s for safety.
    setTimeout(() => void copyText(''), 20_000);
  }

  const setSecret = (k: string, v: string) =>
    setForm((f) => ({ ...f, secret: { ...f.secret, [k]: v } }));

  return (
    <GlassModal open={open} onClose={onClose} title={editing ? t('item.editTitle') : t('item.newTitle')}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-3"
      >
        <div className="flex flex-wrap gap-2">
          {TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type }))}
              className={
                'rounded-lg px-3 py-1.5 text-xs font-medium transition ' +
                (form.type === type
                  ? 'bg-accent text-fg-on-accent'
                  : 'border border-line bg-surface-2 text-fg-muted hover:text-fg')
              }
            >
              {t(`vault.types.${type}`)}
            </button>
          ))}
        </div>

        {/* Free-text fields take the direction of what the user types. */}
        <GlassInput
          label={t('item.title')}
          dir="auto"
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder={t('item.titlePlaceholder')}
        />

        <div className="grid grid-cols-2 gap-3">
          <GlassInput
            label={t('item.username')}
            dir="auto"
            value={form.username ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          />
          <GlassInput
            label={t('item.folder')}
            dir="auto"
            value={form.folder ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, folder: e.target.value }))}
            placeholder={t('item.folderPlaceholder')}
          />
        </div>

        {/* URLs always read left to right. */}
        <GlassInput
          label={t('item.url')}
          dir="ltr"
          inputMode="url"
          className="rtl:text-right"
          value={form.url ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          placeholder="https://…"
        />

        {/* Password / secret value */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-fg-muted">{t('item.password')}</span>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={reveal ? 'text' : 'password'}
                // Passwords never mirror; the reveal button still sits at the inline end.
                dir="ltr"
                value={form.secret.password ?? ''}
                onChange={(e) => setSecret('password', e.target.value)}
                // i18n-allow-physical: the input is dir="ltr", so its padding follows the page direction explicitly.
                className="w-full rounded-xl border border-line-strong bg-surface-2 px-3.5 py-2.5 pr-10 text-fg placeholder:text-fg-subtle focus:border-accent-fg focus:outline-none rtl:pl-10 rtl:pr-3.5 rtl:text-right"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                aria-label={reveal ? t('item.hide') : t('item.reveal')}
              >
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <GlassButton type="button" variant="ghost" onClick={copyPassword} aria-label={t('item.copy')}>
              <Copy className="h-4 w-4" />
            </GlassButton>
            <GlassButton
              type="button"
              variant="ghost"
              onClick={() => setShowGen((s) => !s)}
              aria-label={t('item.generate')}
            >
              <Wand2 className="h-4 w-4" />
            </GlassButton>
          </div>
          <StrengthMeter password={form.secret.password ?? ''} />
          {showGen && (
            <div className="mt-2">
              <PasswordGenerator
                onGenerate={(pw) => {
                  setSecret('password', pw);
                  setReveal(true);
                }}
              />
            </div>
          )}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-fg-muted">{t('item.notes')}</span>
          <textarea
            dir="auto"
            value={form.secret.notes ?? ''}
            onChange={(e) => setSecret('notes', e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-line-strong bg-surface-2 px-3.5 py-2.5 text-fg placeholder:text-fg-subtle focus:border-accent-fg focus:outline-none"
            placeholder={t('item.notesPlaceholder')}
          />
        </label>

        <div className="flex items-center justify-between pt-2">
          {editing ? (
            <button
              type="button"
              onClick={() => remove.mutate()}
              className="inline-flex items-center gap-1.5 text-sm text-danger transition hover:text-danger/80"
            >
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <GlassButton type="button" variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </GlassButton>
            <GlassButton type="submit" disabled={save.isPending}>
              {save.isPending ? t('common.saving') : t('common.save')}
            </GlassButton>
          </div>
        </div>
      </form>
    </GlassModal>
  );
}
