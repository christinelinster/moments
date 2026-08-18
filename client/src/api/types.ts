export type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type ThemeKey =
  | "field-journal"
  | "poolside"
  | "citrus-notebook"
  | "moonlight-ink";

export type Scrapbook = {
  id: string;
  ownerId: string;
  title: string;
  themeKey: ThemeKey | string;
  shareEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Album = {
  id: string;
  scrapbookId?: string;
  name: string;
  position: number;
  createdAt?: string;
  updatedAt?: string;
};

export type MediaItem = {
  id: string;
  scrapbookId?: string;
  albumId: string | null;
  originalName: string;
  mediaType: "photo" | "video" | string;
  mimeType: string;
  byteSize: number;
  fileUrl: string;
  caption: string | null;
  location: string | null;
  position: number;
  createdAt: string;
};

export type EditorMembership = {
  id: string;
  scrapbookId?: string;
  email: string;
  userId: string | null;
  linkedAt: string | null;
  createdAt?: string;
};

export type ScrapbookSnapshot = {
  scrapbook: Scrapbook;
  editors: EditorMembership[];
  role?: "owner" | "editor";
};

export type PublicSnapshot = {
  scrapbook: Omit<Scrapbook, "ownerId" | "shareEnabled">;
  albums: Album[];
  media: MediaItem[];
  stickerAssets: StickerAsset[];
  stickerPlacements: StickerPlacement[];
};

export type StickerAsset = {
  id: string;
  scrapbookId?: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  fileUrl?: string;
};

export type StickerPlacement = {
  id: string;
  albumId: string;
  stickerAssetId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  layer: number;
};
