import { FolderLock, KeyRound, Lock, LogOut, Settings, StickyNote } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useI18n, type MessageKey } from '../i18n/LanguageProvider';
import { api } from '../lib/api';
import { cn } from './ui/cn';
import { Logo } from './ui/Logo';
import { ThemeToggle } from './ui/ThemeToggle';

const nav: { to: string; label: MessageKey; icon: typeof KeyRound }[] = [
  { to: '/vault', label: 'nav.vault', icon: KeyRound },
  { to: '/files', label: 'nav.files', icon: FolderLock },
  { to: '/notes', label: 'nav.notes', icon: StickyNote },
  { to: '/settings', label: 'nav.settings', icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { session, refresh, logout } = useAuth();
  const { t } = useI18n();

  async function lock() {
    await api.lock();
    await refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1200px] gap-6 p-4 md:p-6">
      {/* Sidebar */}
      <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-[210px] shrink-0 flex-col rounded-glass border border-line bg-surface-1 p-3 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2 pt-2">
          <Logo size={30} />
          <span className="text-[15px] font-semibold tracking-tight text-fg">Lockly</span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-accent/10 text-fg'
                    : 'text-fg-muted hover:bg-surface-3 hover:text-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute start-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
                  )}
                  <Icon
                    className={cn(
                      'h-[18px] w-[18px] transition-colors',
                      isActive ? 'text-accent-fg' : 'text-fg-muted group-hover:text-fg',
                    )}
                    strokeWidth={1.75}
                  />
                  {t(label)}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-line pt-3">
          <ThemeToggle className="mx-2 mb-2" />
          <div className="mb-2 flex items-center gap-2.5 px-2 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-[11px] font-semibold uppercase text-fg-muted">
              {session?.email?.[0] ?? 'U'}
            </div>
            <span dir="auto" className="truncate text-xs text-fg-muted">
              {session?.email}
            </span>
          </div>
          <button
            onClick={lock}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg"
          >
            <Lock className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {t('common.lockVault')}
          </button>
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors duration-150 hover:bg-surface-3 hover:text-fg"
          >
            {/* Exit arrow points out of the reading direction, so it mirrors in RTL. */}
            <LogOut className="h-[18px] w-[18px] rtl:-scale-x-100" strokeWidth={1.75} />
            {t('common.signOut')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <div className="mb-4 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2">
            <Logo size={26} />
            <span className="font-semibold">Lockly</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={lock}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-fg-muted transition-colors hover:text-fg"
              aria-label={t('common.lockVault')}
            >
              <Lock className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>
        {children}
        {/* Mobile bottom nav */}
        <nav className="fixed bottom-3 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-2xl border border-line bg-surface-1 p-1.5 shadow-pop md:hidden">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-xs transition-colors',
                  isActive ? 'bg-accent/10 text-accent-fg' : 'text-fg-muted',
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {t(label)}
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  );
}
