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
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface Session {
  id: string;
  email: string;
  unlocked: boolean;
}
