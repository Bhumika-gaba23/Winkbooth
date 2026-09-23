import type { LayoutSpec } from "@/types/domain";

const stack = (count: number) => Array.from({ length: count }, (_, index) => ({ x: .06, y: .03 + index * (.78 / count + .015), w: .88, h: .78 / count }));
export const layouts: LayoutSpec[] = [
  { id: "strip2", name: "Strip · 2 Pose", size: "2×6", slots: stack(2), description: "Two roomy portraits" },
  { id: "strip3", name: "Strip · 3 Pose", size: "2×6", slots: stack(3), description: "Three classic moments" },
  { id: "strip4", name: "Strip · 4 Pose", size: "2×6", slots: stack(4), description: "The timeless four-shot" },
  { id: "grid4", name: "Contact sheet", size: "4×6", slots: [{ x:.04,y:.04,w:.44,h:.43 },{ x:.52,y:.04,w:.44,h:.43 },{ x:.04,y:.53,w:.44,h:.43 },{ x:.52,y:.53,w:.44,h:.43 }], description: "Four little moments" },
];
export const filters = ["None", "Romantic", "Clean", "Nature", "Sunlit", "Mono"];
export const effects = ["None", "Soft focus", "Warm glow", "Cool dream", "Faded film", "Grain"];
export const stickers = ["✦", "♡", "✿", "☻", "⚡", "☁", "🎀", "🍒"];
