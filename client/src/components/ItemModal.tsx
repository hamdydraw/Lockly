import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Eye, EyeOff, Trash2, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { copyText } from '../lib/clipboard';
import type { ItemInput, ItemType } from '../lib/types';
import { PasswordGenerator } from './PasswordGenerator';
import { StrengthMeter } from './StrengthMeter';
import { GlassButton } from './ui/GlassButton';
import { GlassInput } from './ui/GlassInput';
import { GlassModal } from './ui/GlassModal';
import { useToast } from './ui/Toast';

const TYPES: { value: ItemType; label: string }[] = [
  { value: 'LOGIN', label: 'Login' },
  { value: 'CARD', label: 'Card' },
  { value: 'SECURE_NOTE', label: 'Secure note' },
  { value: 'OTHER', label: 'Other' },
];

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
      toast(editing ? 'Item updated' : 'Item saved', 'success');
      onClose();
    },
    onError: (err) =>
      toast(err instanceof ApiError ? err.message : 'Save failed', 'error'),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteItem(itemId!),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['items'] });
      toast('Item deleted', 'success');
      onClose();
    },
  });

  async function copyPassword() {
    const pw = form.secret.password ?? '';
    if (!pw) return;
    if (!(await copyText(pw))) {
      toast('Could not access the clipboard', 'error');
      return;
    }
    toast('Password copied — clears in 20s', 'info');
    // Auto-clear clipboard after 20s for safety.
    setTimeout(() => void copyText(''), 20_000);
  }

  const setSecret = (k: string, v: string) =>
    setForm((f) => ({ ...f, secret: { ...f.secret, [k]: v } }));

  return (
    <GlassModal open={open} onClose={onClose} title={editing ? 'Edit item' : 'New item'}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-3"
      >
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: t.value }))}
              className={
                'rounded-lg px-3 py-1.5 text-xs font-medium transition ' +
                (form.type === t.value
                  ? 'bg-accent text-fg-on-accent'
                  : 'border border-line bg-surface-2 text-fg-muted hover:text-fg')
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <GlassInput
          label="Title"
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="e.g. My Bank"
        />

        <div className="grid grid-cols-2 gap-3">
          <GlassInput
            label="Username"
            value={form.username ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          />
          <GlassInput
            label="Folder"
            value={form.folder ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, folder: e.target.value }))}
            placeholder="e.g. Banking"
          />
        </div>

        <GlassInput
          label="URL"
          value={form.url ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          placeholder="https://…"
        />

        {/* Password / secret value */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-fg-muted">Password</span>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={reveal ? 'text' : 'password'}
                value={form.secret.password ?? ''}
                onChange={(e) => setSecret('password', e.target.value)}
                className="w-full rounded-xl border border-line-strong bg-surface-2 px-3.5 py-2.5 pr-10 text-fg placeholder:text-fg-subtle focus:border-accent-fg focus:outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                aria-label={reveal ? 'Hide' : 'Reveal'}
              >
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <GlassButton type="button" variant="ghost" onClick={copyPassword} aria-label="Copy">
              <Copy className="h-4 w-4" />
            </GlassButton>
            <GlassButton
              type="button"
              variant="ghost"
              onClick={() => setShowGen((s) => !s)}
              aria-label="Generate"
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
          <span className="mb-1.5 block text-sm font-medium text-fg-muted">Notes</span>
          <textarea
            value={form.secret.notes ?? ''}
            onChange={(e) => setSecret('notes', e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-line-strong bg-surface-2 px-3.5 py-2.5 text-fg placeholder:text-fg-subtle focus:border-accent-fg focus:outline-none"
            placeholder="Anything else to remember…"
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
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <GlassButton type="button" variant="ghost" onClick={onClose}>
              Cancel
            </GlassButton>
            <GlassButton type="submit" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </GlassButton>
          </div>
        </div>
      </form>
    </GlassModal>
  );
}
