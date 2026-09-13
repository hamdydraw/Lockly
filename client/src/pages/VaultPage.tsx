import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CreditCard, FileText, Globe, KeyRound, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { ItemModal } from '../components/ItemModal';
import { GlassButton } from '../components/ui/GlassButton';
import { GlassCard } from '../components/ui/GlassCard';
import { api } from '../lib/api';
import type { ItemMeta, ItemType } from '../lib/types';

const ICONS: Record<ItemType, typeof KeyRound> = {
  LOGIN: KeyRound,
  CARD: CreditCard,
  SECURE_NOTE: FileText,
  OTHER: Globe,
};

export function VaultPage() {
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();

  const { data: items, isLoading } = useQuery({
    queryKey: ['items', q],
    queryFn: () => api.listItems(q || undefined),
  });

  function openNew() {
    setEditId(undefined);
    setModalOpen(true);
  }
  function openEdit(item: ItemMeta) {
    setEditId(item.id);
    setModalOpen(true);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Vault</h1>
        <GlassButton onClick={openNew}>
          <Plus className="h-4 w-4" />
          Add item
        </GlassButton>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search vault…"
          className="w-full rounded-xl border border-line-strong bg-surface-2 py-2.5 pl-10 pr-4 text-fg placeholder:text-fg-subtle focus:border-accent-fg focus:outline-none"
        />
      </div>

      {isLoading ? (
        <p className="text-fg-muted">Loading…</p>
      ) : !items || items.length === 0 ? (
        <GlassCard className="text-center text-fg-muted">
          {q ? 'No matching items.' : 'Your vault is empty. Add your first item.'}
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const Icon = ICONS[item.type] ?? KeyRound;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => openEdit(item)}
                className="rounded-glass border border-line bg-surface-2 p-4 text-left shadow-raised transition hover:bg-surface-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                    <Icon className="h-5 w-5 text-accent-fg" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.title}</p>
                    <p className="truncate text-xs text-fg-muted">
                      {item.username || item.url || item.type}
                    </p>
                  </div>
                </div>
                {item.folder && (
                  <span className="mt-3 inline-block rounded-full bg-surface-3 px-2 py-0.5 text-[11px] text-fg-muted">
                    {item.folder}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      <ItemModal open={modalOpen} onClose={() => setModalOpen(false)} itemId={editId} />
    </div>
  );
}
