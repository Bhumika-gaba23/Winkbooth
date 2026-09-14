export type BoothMode = "strip" | "framed" | "cam" | "custom";
export type Slot = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
};
export type LayoutSpec = {
  id: string;
  name: string;
  size: string;
  width: number;
  height: number;
  slots: Slot[];
  category: string;
  description: string;
};
export type FilterPreset = { id: string; name: string; css: string };
export type FrameTemplate = {
  id: string;
  name: string;
  category: string;
  layoutId: string;
  colors: [string, string, string];
  motif: string;
};
export type OverlayLayer = {
  id: string;
  kind: "sticker" | "text";
  value: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  color: string;
  font?: "display" | "sans";
  size?: number;
};
export type CaptureSession = {
  id: string;
  createdAt: number;
  mode: BoothMode;
  layoutId: string;
  frameId?: string;
  shots: string[];
  extras: string[][];
  filterId: string;
  filterIntensity: number;
  effectId: string;
  overlays: OverlayLayer[];
  theme: { frame: string; accent: string; label: string; gradient: boolean };
  showBranding: boolean;
  showDate: boolean;
  mirror: boolean;
  boomerang?: Blob;
};
export type Album = {
  id: string;
  name: string;
  createdAt: number;
  pinned: boolean;
  coverPhotoId?: string;
};
export type GalleryPhoto = {
  id: string;
  createdAt: number;
  layoutId: string;
  albumId?: string;
  hidden: boolean;
  image?: Blob;
  thumbnail?: Blob;
  cipher?: ArrayBuffer;
  thumbCipher?: ArrayBuffer;
  iv?: Uint8Array;
  thumbIv?: Uint8Array;
};
export type VaultConfig = {
  id: "vault";
  kind: "pin" | "password" | "pattern";
  salt: Uint8Array;
  iv: Uint8Array;
  sentinel: ArrayBuffer;
  iterations: number;
};
