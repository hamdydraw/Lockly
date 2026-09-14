export type ItemType = 'LOGIN' | 'SECURE_NOTE' | 'CARD' | 'OTHER';

export interface ItemMeta {
  id: string;
  type: ItemType;
  title: string;
  folder: string | null;
  username: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItemFull extends ItemMeta {
  secret: Record<string, string>;
}

export interface ItemInput {
  type: ItemType;
  title: string;
  folder?: string | null;
  username?: string | null;
  url?: string | null;
  secret: Record<string, string>;
}

export interface FileMeta {
  id: string;
  filename: string;
  folder: string | null;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

/** Paper colours for sticky notes; the list itself lives in lib/notes.ts. */
export type NoteColor = 'amber' | 'rose' | 'sky' | 'mint' | 'lilac' | 'slate';

/** A sticky note. `body` arrives decrypted — the list endpoint opens every note. */
export interface Note {
  id: string;
  title: string;
  body: string;
  color: NoteColor;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title?: string;
  body?: string;
  color?: NoteColor;
  pinned?: boolean;
}

export interface Session {
  id: string;
  email: string;
  unlocked: boolean;
}
