/**
 * Holds decrypted per-user Data Keys in memory after a successful `unlock`.
 * Never persisted to disk. Entries expire (auto-lock) and are cleared on lock/logout.
 */

interface Entry {
  dataKey: Buffer;
  expiresAt: number; // epoch ms
}

const TTL_MS = 15 * 60 * 1000; // 15-minute auto-lock

class UnlockStore {
  private map = new Map<string, Entry>();

  unlock(userId: string, dataKey: Buffer, now: number): number {
    const expiresAt = now + TTL_MS;
    this.map.set(userId, { dataKey, expiresAt });
    return expiresAt;
  }

  /** Returns the data key if unlocked & not expired, refreshing the TTL. */
  get(userId: string, now: number): Buffer | null {
    const entry = this.map.get(userId);
    if (!entry) return null;
    if (entry.expiresAt <= now) {
      this.map.delete(userId);
      return null;
    }
    // Sliding expiration: activity extends the unlock window.
    entry.expiresAt = now + TTL_MS;
    return entry.dataKey;
  }

  lock(userId: string): void {
    this.map.delete(userId);
  }
}

export const unlockStore = new UnlockStore();
