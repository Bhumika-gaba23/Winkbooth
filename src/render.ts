import { filters, frames, layouts } from "./catalog";
import type { CaptureSession } from "./types";
export const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = src;
  });
function cover(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  iw: number,
  ih: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const r = Math.max(w / iw, h / ih),
    sw = w / r,
    sh = h / r;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}
export async function compose(session: CaptureSession, scale = 0.5) {
  const layout = layouts.find((x) => x.id === session.layoutId) ?? layouts[0];
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(layout.width * scale);
  canvas.height = Math.round(layout.height * scale);
  const c = canvas.getContext("2d")!;
  const frame = frames.find((x) => x.id === session.frameId);
  const bg = frame?.colors[0] ?? session.theme.frame;
  const accent = frame?.colors[1] ?? session.theme.accent;
  c.fillStyle = bg;
  c.fillRect(0, 0, canvas.width, canvas.height);
  if (session.theme.gradient) {
    const g = c.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, bg);
    g.addColorStop(1, accent);
    c.fillStyle = g;
    c.fillRect(0, 0, canvas.width, canvas.height);
  }
  const filter = filters.find((x) => x.id === session.filterId)?.css ?? "none";
  const effectFilter = ({
    "soft-focus": "blur(1.2px) brightness(1.06)",
    "warm-glow": "sepia(.22) saturate(1.22) brightness(1.06)",
    "cool-dream": "saturate(.88) hue-rotate(14deg) brightness(1.08)",
    "high-contrast": "contrast(1.32) saturate(1.08)",
    "faded-film": "contrast(.86) saturate(.76) brightness(1.1)",
  } as Record<string, string>)[session.effectId] ?? "none";
  c.filter = [filter, effectFilter].filter((value) => value !== "none").join(" ") || "none";
  for (let i = 0; i < layout.slots.length; i++) {
    const slot = layout.slots[i],
      src = session.shots[i];
    const x = slot.x * canvas.width,
      y = slot.y * canvas.height,
      w = slot.w * canvas.width,
      h = slot.h * canvas.height;
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    if (src) {
      const im = await loadImage(src);
      cover(c, im, im.naturalWidth, im.naturalHeight, x, y, w, h);
    } else {
      c.fillStyle = "#d8d1c2";
      c.fillRect(x, y, w, h);
    }
    c.restore();
  }
  c.filter = "none";
  if (session.effectId === "light-leak") {
    const leak = c.createLinearGradient(0, 0, canvas.width * 0.8, canvas.height);
    leak.addColorStop(0, "rgba(255,120,170,.32)");
    leak.addColorStop(0.28, "rgba(255,220,140,.16)");
    leak.addColorStop(0.58, "rgba(255,255,255,0)");
    c.fillStyle = leak;
    c.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (frame) {
    c.fillStyle = frame.colors[2];
    c.font = `${Math.round(canvas.width * 0.055)}px Fraunces`;
    c.textAlign = "center";
    c.fillText(
      `${frame.motif} ${frame.name.replace(/ \d+$/, "")} ${frame.motif}`,
      canvas.width / 2,
      canvas.height * 0.965,
    );
  }
  if (session.effectId === "vignette") {
    const g = c.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      canvas.width * 0.2,
      canvas.width / 2,
      canvas.height / 2,
      canvas.height * 0.75,
    );
    g.addColorStop(0, "transparent");
    g.addColorStop(1, "rgba(30,20,10,.48)");
    c.fillStyle = g;
    c.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (session.effectId === "grain") {
    c.globalAlpha = 0.16;
    for (let i = 0; i < (canvas.width * canvas.height) / 250; i++) {
      c.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
      c.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        1,
        1,
      );
    }
    c.globalAlpha = 1;
  }
  if (session.effectId === "sparkle" || session.effectId === "heart-crown") {
    c.textAlign = "center";
    c.font = `${canvas.width * 0.06}px serif`;
    for (let i = 0; i < 10; i++)
      c.fillText(
        session.effectId === "sparkle" ? "✦" : "♥",
        (((i % 5) + 0.5) * canvas.width) / 5,
        ((Math.floor(i / 5) + 0.55) * canvas.height) / 2,
      );
  }
  for (const layer of session.overlays) {
    c.save();
    c.globalAlpha = layer.opacity;
    c.translate(layer.x * canvas.width, layer.y * canvas.height);
    c.rotate((layer.rotation * Math.PI) / 180);
    c.scale(layer.scale, layer.scale);
    c.fillStyle = layer.color;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font =
      layer.kind === "text"
        ? `${(layer.size ?? 36) * scale}px ${layer.font === "sans" ? "DM Sans" : "Fraunces"}`
        : `${60 * scale}px serif`;
    c.fillText(layer.value, 0, 0);
    c.restore();
  }
  c.fillStyle = session.theme.label;
  c.textAlign = "center";
  if (session.showBranding) {
    c.font = `600 ${Math.max(12, canvas.width * 0.035)}px Fraunces`;
    c.fillText("WinkBooth", canvas.width / 2, canvas.height * 0.94);
  }
  if (session.showDate) {
    c.font = `${Math.max(9, canvas.width * 0.018)}px DM Sans`;
    c.fillText(
      new Date(session.createdAt).toLocaleDateString(),
      canvas.width / 2,
      canvas.height * 0.982,
    );
  }
  return canvas;
}
export async function dataUrlToBlob(url: string) {
  return fetch(url).then((r) => r.blob());
}
export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
