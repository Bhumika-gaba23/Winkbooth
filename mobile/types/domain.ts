export type BoothMode = "strip" | "framed" | "cam";
export type ThemeId = "classic" | "candy" | "forest" | "sunrise" | "lemon" | "sky" | "lavender" | "peach" | "mint";
export type Slot = { x: number; y: number; w: number; h: number };
export type LayoutSpec = { id: string; name: string; size: string; slots: Slot[]; description: string };
export type OverlayLayer = { id: string; kind: "sticker" | "text"; value: string; x: number; y: number; scale: number; rotation: number; color: string; size?: number };
export type CaptureSession = { id: string; createdAt: number; mode: BoothMode; layoutId: string; shots: string[]; extras: string[][]; filterId: string; filterIntensity: number; effectId: string; overlays: OverlayLayer[]; frameColor: string; accentColor: string; labelColor: string; showBranding: boolean; showDate: boolean; mirror: boolean; boomerangUri?: string };
export type GalleryPhoto = { id: string; createdAt: number; layoutId: string; imageUri: string; thumbnailUri?: string; videoUri?: string; albumId?: string; hidden: boolean };
export type Album = { id: string; name: string; createdAt: number; pinned: boolean; coverPhotoId?: string };
