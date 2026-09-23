import type { ThemeId } from "@/types/domain";

export const themes: Record<ThemeId, { label: string; paper: string; surface: string; surface2: string; ink: string; muted: string; pink: string; yellow: string; green: string }> = {
  classic: { label: "Classic", paper: "#fff0f5", surface: "#fff8fb", surface2: "#f8dce7", ink: "#512437", muted: "#704b5c", pink: "#d95783", yellow: "#f3abc3", green: "#a97899" },
  candy: { label: "Candy", paper: "#fff0f6", surface: "#fff9fc", surface2: "#ffe0ee", ink: "#572c48", muted: "#713c5b", pink: "#f19bc2", yellow: "#ffd56f", green: "#98d8c2" },
  forest: { label: "Forest", paper: "#e8efe2", surface: "#f8fbf0", surface2: "#d7e7d3", ink: "#263c35", muted: "#456257", pink: "#d8a3a0", yellow: "#e7c45e", green: "#79a982" },
  sunrise: { label: "Sunrise", paper: "#fff1df", surface: "#fffaf2", surface2: "#ffe1c5", ink: "#5a3027", muted: "#815649", pink: "#ed8d76", yellow: "#f5b84b", green: "#a8c49a" },
  lemon: { label: "Lemon", paper: "#fffde0", surface: "#fffff2", surface2: "#f6f0b7", ink: "#41421f", muted: "#6c6d3e", pink: "#e9a84f", yellow: "#f3d34a", green: "#9fbd63" },
  sky: { label: "Sky", paper: "#e9f7ff", surface: "#f8fdff", surface2: "#cdebf6", ink: "#21435a", muted: "#4e7182", pink: "#72b8d5", yellow: "#f4c95d", green: "#8fc8b2" },
  lavender: { label: "Lavender", paper: "#f5efff", surface: "#fdfaff", surface2: "#e8daf7", ink: "#443450", muted: "#6f5b7e", pink: "#b99bd8", yellow: "#e2c56d", green: "#9fc7b0" },
  peach: { label: "Peach", paper: "#fff0e9", surface: "#fffaf7", surface2: "#fbd8ca", ink: "#5a342f", muted: "#815b54", pink: "#ee9c8b", yellow: "#efbd63", green: "#acd0b0" },
  mint: { label: "Mint", paper: "#e9f8ef", surface: "#f8fff9", surface2: "#cfeedd", ink: "#23483f", muted: "#4e756a", pink: "#79c4ad", yellow: "#e8cb62", green: "#8fbe91" },
};
