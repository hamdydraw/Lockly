import { FolderLock, KeyRound, Lock, LogOut, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../lib/api';
import { cn } from './ui/cn';
import { Logo } from './ui/Logo';

const nav = [
  { to: '/vault', label: 'Vault', icon: KeyRound },
  { to: '/files', label: 'Files', icon: FolderLock },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { session, refresh, logout } = useAuth();

  async function lock() {
    await api.lock();
    await refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1200px] gap-6 p-4 md:p-6">
      {/* Sidebar */}
      <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-[210px] shrink-0 flex-col rounded-glass border border-line bg-sidebar p-3 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2 pt-2">
          <Logo size={30} />
          <span className="text-[15px] font-semibold tracking-tight text-ink">Lockly</span>
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
                    ? 'bg-violet-glow/10 text-ink'
                    : 'text-muted hover:bg-white/[0.04] hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-violet-glow" />
                  )}
                  <Icon
                    className={cn(
                      'h-[18px] w-[18px] transition-colors',
                      isActive ? 'text-violet-glow' : 'text-muted group-hover:text-ink',
                    )}
                    strokeWidth={1.75}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 border-t border-line pt-3">
          <div className="mb-2 flex items-center gap-2.5 px-2 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-card text-[11px] font-semibold uppercase text-muted">
              {session?.email?.[0] ?? 'U'}
            </div>
            <span className="truncate text-xs text-muted">{session?.email}</span>
          </div>
          <button
            onClick={lock}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors duration-150 hover:bg-white/[0.04] hover:text-ink"
          >
            <Lock className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Lock vault
          </button>
          <button
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors duration-150 hover:bg-white/[0.04] hover:text-ink"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Sign out
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
          <button onClick={lock} className="text-muted transition-colors hover:text-ink">
            <Lock className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>
        {children}
        {/* Mobile bottom nav */}
        <nav className="fixed bottom-3 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-2xl border border-line bg-sidebar p-1.5 shadow-pop md:hidden">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-xs transition-colors',
                  isActive ? 'bg-violet-glow/10 text-violet-glow' : 'text-muted',
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  );
}
