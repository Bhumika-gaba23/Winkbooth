import type { OverlayLayer } from "@/types/domain";

export type FaceBounds = { x: number; y: number; width: number; height: number };

/** Converts native face-detector bounds into the editor's percentage coordinates. */
export function faceFilterOverlay(face: FaceBounds, preview: { width: number; height: number }, sticker = "♡"): OverlayLayer {
  const x = ((face.x + face.width / 2) / preview.width) * 100;
  const y = (face.y / preview.height) * 100;
  return { id: `face-${Date.now()}`, kind: "sticker", value: sticker, x, y, scale: face.width / preview.width, rotation: 0, color: "#ffffff", size: Math.max(24, Math.round(face.width * .28)) };
}
