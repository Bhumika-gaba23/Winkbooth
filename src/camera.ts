import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
type FaceBox = { x: number; y: number; width: number; height: number };
type DetectorResult = { boundingBox: FaceBox };
type FaceDetectorConstructor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
  detect: (source: HTMLVideoElement) => Promise<DetectorResult[]>;
};
type LiveFaceBox = { left: number; top: number; width: number; height: number };
export type FaceLandmark = { x: number; y: number; z?: number };
export type FaceGeometry = {
  forehead: FaceLandmark;
  eyeMidpoint: FaceLandmark;
  nose: FaceLandmark;
  leftCheek: FaceLandmark;
  rightCheek: FaceLandmark;
  eyeDistance: number;
  rotation: number;
  bounds: { x: number; y: number; width: number; height: number };
};

function scaleFaceBox(face: FaceBox, multiplier: number) {
  const width = face.width * multiplier;
  const height = face.height * multiplier;
  return {
    x: face.x + (face.width - width) / 2,
    y: face.y + (face.height - height) / 2,
    width,
    height,
  };
}

type FilterPalette = { ink: string; surface: string; pink: string; yellow: string; green: string };
function getFilterPalette(): FilterPalette {
  if (typeof document === "undefined") return { ink: "#33291f", surface: "#fffaf0", pink: "#e8b7b6", yellow: "#f2c94c", green: "#8ea98f" };
  const style = getComputedStyle(document.documentElement);
  const color = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return { ink: color("--ink", "#33291f"), surface: color("--cream", "#fffaf0"), pink: color("--pink", "#e8b7b6"), yellow: color("--yellow", "#f2c94c"), green: color("--green", "#8ea98f") };
}
function withOpacity(color: string, opacity: number) {
  const hex = color.replace("#", "");
  const value = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex;
  if (/^[0-9a-f]{6}$/i.test(value)) return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${opacity})`;
  return color;
}
export function mapLandmarksToCanvas(points: FaceLandmark[], width: number, height: number) {
  return points.map((point) => ({ ...point, x: point.x * width, y: point.y * height }));
}
export function calculateFaceGeometry(points: FaceLandmark[], width: number, height: number): FaceGeometry | null {
  const mapped = mapLandmarksToCanvas(points, width, height);
  const at = (index: number, fallback: FaceLandmark) => mapped[index] ?? fallback;
  if (!mapped.length) return null;
  const fallback = mapped[Math.floor(mapped.length / 2)];
  const leftEye = at(33, fallback), rightEye = at(263, fallback);
  const xs = mapped.map((point) => point.x), ys = mapped.map((point) => point.y);
  return {
    forehead: at(10, { x: (leftEye.x + rightEye.x) / 2, y: Math.min(...ys) }),
    eyeMidpoint: { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 },
    nose: at(1, fallback),
    leftCheek: at(234, { x: Math.min(...xs), y: fallback.y }),
    rightCheek: at(454, { x: Math.max(...xs), y: fallback.y }),
    eyeDistance: Math.max(1, Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y)),
    rotation: Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x),
    bounds: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
  };
}
export function smoothLandmarks(previous: FaceLandmark[] | null, next: FaceLandmark[], alpha = .35) {
  if (!previous || previous.length !== next.length) return next.map((point) => ({ ...point }));
  return next.map((point, index) => ({
    x: previous[index].x + (point.x - previous[index].x) * alpha,
    y: previous[index].y + (point.y - previous[index].y) * alpha,
    z: (previous[index].z ?? 0) + ((point.z ?? 0) - (previous[index].z ?? 0)) * alpha,
  }));
}

function drawTrackedFilter(ctx: CanvasRenderingContext2D, points: FaceLandmark[], width: number, height: number, filterId: string, sizeMultiplier = 1, shadeColor = "#f06f9f") {
  const geometry = calculateFaceGeometry(points, width, height);
  if (!geometry) return;
  const { rotation, eyeMidpoint: eyes, forehead, nose, leftCheek, rightCheek } = geometry;
  const d = geometry.eyeDistance * sizeMultiplier;
  ctx.save();
  ctx.translate(0, 0);
  if (filterId === "puppy") {
    ctx.save();
    ctx.translate(forehead.x, forehead.y);
    ctx.rotate(rotation);
    drawPuppyEars(ctx, d);
    ctx.restore();
    drawPuppyNose(ctx, nose, d, rotation);
  } else if (filterId === "butterflies") {
    ctx.save();
    ctx.translate(forehead.x, forehead.y);
    ctx.rotate(rotation);
    drawButterflyClips(ctx, d);
    ctx.restore();
  } else if (filterId === "bunny") {
    // Build the ears from the forehead and eye distance rather than drawing
    // generic ovals. This keeps them seated on the head as it turns.
    ctx.translate(forehead.x, forehead.y);
    ctx.rotate(rotation);
    drawBunnyEars(ctx, d);
  } else if (filterId === "kitty") {
    ctx.translate(forehead.x, forehead.y);
    ctx.rotate(rotation);
    drawKittyEars(ctx, d);
    ctx.strokeStyle = "#9d4868";
    ctx.lineWidth = Math.max(2, d * .025);
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * d * .12, d * 1.18); ctx.lineTo(side * d * 1.02, d * 1.08); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(side * d * .12, d * 1.24); ctx.lineTo(side * d * 1.02, d * 1.32); ctx.stroke();
    }
  } else if (filterId === "goggles" || filterId === "sunnies") {
    ctx.translate(eyes.x, eyes.y);
    ctx.rotate(rotation);
    drawEyewear(ctx, d, filterId, shadeColor);
  } else if (filterId === "blush") {
    for (const cheek of [leftCheek, rightCheek]) {
      const x = cheek.x * .68 + nose.x * .32, y = cheek.y * .68 + nose.y * .32 + d * .1;
      drawSweetBlush(ctx, x, y, d, rotation);
    }
  } else if (filterId === "freckles") {
    drawCuteFreckles(ctx, nose, leftCheek, rightCheek, d, rotation);
  } else if (filterId === "flower") {
    drawCherryCheekStamps(ctx, nose, leftCheek, rightCheek, d, rotation);
  } else {
    const anchor = forehead;
    const face = { x: anchor.x - d * 1.45, y: anchor.y, width: d * 2.9, height: d * 3.1 };
    ctx.translate(anchor.x, anchor.y);
    ctx.rotate(rotation);
    ctx.translate(-anchor.x, -anchor.y);
    drawFaceFilter(ctx, face, filterId);
  }
  void nose;
  ctx.restore();
}

function drawBunnyEar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tilt: number) {
  const palette = getFilterPalette();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.shadowColor = "rgba(112, 47, 75, .22)";
  ctx.shadowBlur = size * .11;
  ctx.shadowOffsetY = size * .045;
  ctx.fillStyle = palette.surface;
  ctx.strokeStyle = palette.pink;
  ctx.lineWidth = Math.max(2, size * .035);
  ctx.beginPath();
  ctx.moveTo(0, size * .08);
  ctx.bezierCurveTo(-size * .28, -size * .02, -size * .34, -size * .46, -size * .2, -size * .84);
  ctx.bezierCurveTo(-size * .11, -size * 1.09, size * .11, -size * 1.13, size * .23, -size * .86);
  ctx.bezierCurveTo(size * .39, -size * .51, size * .28, -size * .08, 0, size * .08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = palette.pink;
  ctx.beginPath();
  ctx.moveTo(0, -size * .02);
  ctx.bezierCurveTo(-size * .14, -size * .1, -size * .17, -size * .43, -size * .09, -size * .73);
  ctx.bezierCurveTo(-size * .04, -size * .89, size * .08, -size * .91, size * .14, -size * .71);
  ctx.bezierCurveTo(size * .23, -size * .42, size * .17, -size * .12, 0, -size * .02);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBunnyEars(ctx: CanvasRenderingContext2D, d: number) {
  const palette = getFilterPalette();
  const earSize = d * .96;
  drawBunnyEar(ctx, -d * .43, d * .11, earSize, -.16);
  drawBunnyEar(ctx, d * .43, d * .11, earSize, .16);
  ctx.strokeStyle = withOpacity(palette.pink, .48);
  ctx.lineWidth = Math.max(2, d * .025);
  ctx.beginPath();
  ctx.moveTo(-d * .53, d * .12);
  ctx.quadraticCurveTo(0, d * .24, d * .53, d * .12);
  ctx.stroke();
}

function drawPuppyEar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tilt: number) {
  const palette = getFilterPalette();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.shadowColor = "rgba(72, 37, 24, .28)";
  ctx.shadowBlur = size * .1;
  ctx.shadowOffsetY = size * .06;
  ctx.fillStyle = palette.yellow;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = Math.max(2, size * .042);
  ctx.beginPath();
  ctx.moveTo(-size * .2, -size * .38);
  ctx.bezierCurveTo(-size * .57, -size * .3, -size * .55, size * .18, -size * .3, size * .56);
  ctx.bezierCurveTo(-size * .1, size * .86, size * .28, size * .78, size * .39, size * .39);
  ctx.bezierCurveTo(size * .5, size * .02, size * .2, -size * .35, -size * .2, -size * .38);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = palette.pink;
  ctx.beginPath();
  ctx.moveTo(-size * .12, -size * .22);
  ctx.bezierCurveTo(-size * .34, -size * .1, -size * .31, size * .18, -size * .16, size * .42);
  ctx.bezierCurveTo(-size * .05, size * .6, size * .15, size * .55, size * .22, size * .31);
  ctx.bezierCurveTo(size * .29, size * .06, size * .1, -size * .18, -size * .12, -size * .22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPuppyEars(ctx: CanvasRenderingContext2D, d: number) {
  const palette = getFilterPalette();
  const earSize = d * .66;
  drawPuppyEar(ctx, -d * .55, -d * .38, earSize, -.2);
  drawPuppyEar(ctx, d * .55, -d * .38, earSize, .2);
  ctx.strokeStyle = withOpacity(palette.ink, .48);
  ctx.lineWidth = Math.max(2, d * .022);
  ctx.beginPath();
  ctx.moveTo(-d * .49, -d * .29);
  ctx.quadraticCurveTo(0, -d * .2, d * .49, -d * .29);
  ctx.stroke();
}

function drawPuppyNose(ctx: CanvasRenderingContext2D, nose: FaceLandmark, d: number, rotation: number) {
  const palette = getFilterPalette();
  ctx.save();
  ctx.translate(nose.x, nose.y + d * .08);
  ctx.rotate(rotation);
  ctx.fillStyle = palette.ink;
  ctx.shadowColor = "rgba(37, 20, 16, .22)";
  ctx.shadowBlur = d * .05;
  ctx.shadowOffsetY = d * .025;
  ctx.beginPath();
  ctx.ellipse(0, 0, d * .115, d * .075, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "rgba(255, 216, 203, .42)";
  ctx.beginPath();
  ctx.ellipse(-d * .032, -d * .026, d * .026, d * .012, -.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawButterfly(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, flip: number) {
  const palette = getFilterPalette();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip, 1);
  ctx.fillStyle = palette.pink;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = Math.max(1.5, size * .07);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * size * .32, -size * .18, size * .32, size * .25, side * .38, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = palette.yellow;
    ctx.beginPath();
    ctx.ellipse(side * size * .3, size * .2, size * .2, size * .18, side * -.45, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = palette.pink;
  }
  ctx.fillStyle = palette.green;
  ctx.beginPath(); ctx.ellipse(0, 0, size * .09, size * .34, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = Math.max(1, size * .035);
  ctx.beginPath(); ctx.arc(-size * .06, -size * .31, size * .13, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
  ctx.beginPath(); ctx.arc(size * .06, -size * .31, size * .13, Math.PI * 1.45, Math.PI * 1.95); ctx.stroke();
  ctx.restore();
}

function drawButterflyClips(ctx: CanvasRenderingContext2D, d: number) {
  drawButterfly(ctx, -d * 1.03, d * .34, d * .27, -1);
  drawButterfly(ctx, d * 1.03, d * .34, d * .27, 1);
}

function drawKittyEar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tilt: number) {
  const palette = getFilterPalette();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.shadowColor = "rgba(63, 38, 73, .24)";
  ctx.shadowBlur = size * .1;
  ctx.shadowOffsetY = size * .04;
  ctx.fillStyle = palette.green;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = Math.max(2, size * .04);
  ctx.beginPath();
  ctx.moveTo(-size * .36, size * .07);
  ctx.quadraticCurveTo(-size * .35, -size * .16, -size * .12, -size * .74);
  ctx.quadraticCurveTo(0, -size * .98, size * .13, -size * .73);
  ctx.quadraticCurveTo(size * .38, -size * .13, size * .35, size * .07);
  ctx.quadraticCurveTo(0, size * .17, -size * .36, size * .07);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = palette.pink;
  ctx.beginPath();
  ctx.moveTo(-size * .19, size * .02);
  ctx.quadraticCurveTo(-size * .15, -size * .18, -size * .06, -size * .54);
  ctx.quadraticCurveTo(0, -size * .68, size * .07, -size * .53);
  ctx.quadraticCurveTo(size * .2, -size * .18, size * .19, size * .02);
  ctx.quadraticCurveTo(0, size * .07, -size * .19, size * .02);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawKittyEars(ctx: CanvasRenderingContext2D, d: number) {
  const palette = getFilterPalette();
  const earSize = d * .83;
  drawKittyEar(ctx, -d * .49, d * .12, earSize, -.13);
  drawKittyEar(ctx, d * .49, d * .12, earSize, .13);
  ctx.strokeStyle = withOpacity(palette.ink, .55);
  ctx.lineWidth = Math.max(2, d * .022);
  ctx.beginPath();
  ctx.moveTo(-d * .58, d * .13);
  ctx.quadraticCurveTo(0, d * .21, d * .58, d * .13);
  ctx.stroke();
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const palette = getFilterPalette();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.shadowColor = "rgba(116, 35, 71, .25)";
  ctx.shadowBlur = 2.5;
  ctx.shadowOffsetY = 1.5;
  ctx.fillStyle = color;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = .1;
  ctx.beginPath();
  ctx.moveTo(0, .82);
  ctx.bezierCurveTo(-1.05, .12, -.7, -.82, 0, -.25);
  ctx.bezierCurveTo(.7, -.82, 1.05, .12, 0, .82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const palette = getFilterPalette();
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = "rgba(114, 77, 21, .27)";
  ctx.shadowBlur = size * .3;
  ctx.shadowOffsetY = size * .12;
  ctx.fillStyle = palette.yellow;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = Math.max(1.5, size * .09);
  ctx.beginPath();
  for (let point = 0; point < 10; point++) {
    const angle = -Math.PI / 2 + point * Math.PI / 5;
    const radius = point % 2 ? size * .43 : size;
    const px = Math.cos(angle) * radius, py = Math.sin(angle) * radius;
    if (point === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  const palette = getFilterPalette();
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = "rgba(78, 57, 47, .18)";
  ctx.shadowBlur = size * .35;
  ctx.shadowOffsetY = size * .12;
  ctx.fillStyle = color;
  for (let petal = 0; petal < 5; petal++) {
    ctx.rotate((Math.PI * 2) / 5);
    ctx.beginPath();
    ctx.ellipse(0, -size * .48, size * .32, size * .48, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowColor = "transparent";
  ctx.fillStyle = palette.yellow;
  ctx.beginPath();
  ctx.arc(0, 0, size * .28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCrownBase(ctx: CanvasRenderingContext2D, center: number, y: number, width: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, width * .022);
  ctx.beginPath();
  ctx.moveTo(center - width * .46, y + width * .08);
  ctx.quadraticCurveTo(center, y + width * .19, center + width * .46, y + width * .08);
  ctx.stroke();
}

function drawPearlHalo(ctx: CanvasRenderingContext2D, center: number, y: number, width: number) {
  const palette = getFilterPalette();
  const drawSideBow = (x: number, side: number) => {
    const size = width * .13;
    ctx.save();
    ctx.translate(x, y + width * .035);
    ctx.rotate(side * .12);
    ctx.fillStyle = palette.pink;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = Math.max(2, width * .018);
    for (const loopSide of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(loopSide * size * .35, -size * .72, loopSide * size * 1.08, -size * .7, loopSide * size * 1.4, -size * .08);
      ctx.bezierCurveTo(loopSide * size * 1.1, size * .4, loopSide * size * .34, size * .3, 0, 0);
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = palette.yellow;
    ctx.beginPath(); ctx.roundRect(-size * .3, -size * .25, size * .6, size * .5, size * .12); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = withOpacity(palette.surface, .62);
    ctx.lineWidth = Math.max(1.2, width * .012);
    ctx.beginPath(); ctx.moveTo(side * size * .42, -size * .18); ctx.lineTo(side * size * 1.05, -size * .28); ctx.stroke();
    ctx.restore();
  };
  drawSideBow(center - width * .34, -1);
  drawSideBow(center + width * .34, 1);
}

function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, flip = false) {
  const palette = getFilterPalette();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.fillStyle = palette.yellow;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = Math.max(1.2, radius * .11);
  ctx.beginPath();
  ctx.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2);
  ctx.arc(radius * .38, 0, radius * .83, Math.PI / 2, -Math.PI / 2, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawMoonPhases(ctx: CanvasRenderingContext2D, center: number, y: number, width: number) {
  const palette = getFilterPalette();
  ctx.save();
  ctx.translate(center, y - width * .08);
  ctx.strokeStyle = palette.yellow;
  ctx.fillStyle = withOpacity(palette.yellow, .22);
  ctx.lineWidth = Math.max(2, width * .018);
  ctx.beginPath(); ctx.arc(0, 0, width * .22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (let ray = 0; ray < 8; ray++) {
    const angle = (Math.PI * 2 * ray) / 8;
    ctx.beginPath(); ctx.moveTo(Math.cos(angle) * width * .27, Math.sin(angle) * width * .27); ctx.lineTo(Math.cos(angle) * width * .36, Math.sin(angle) * width * .36); ctx.stroke();
  }
  ctx.fillStyle = palette.yellow;
  ctx.beginPath(); ctx.arc(-width * .35, width * .12, width * .055, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(width * .35, -width * .02, width * .04, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawIvyVine(ctx: CanvasRenderingContext2D, center: number, y: number, width: number) {
  const palette = getFilterPalette();
  for (const side of [-1, 1]) {
    const x = center + side * width * .34;
    ctx.strokeStyle = palette.green;
    ctx.lineWidth = Math.max(2, width * .018);
    ctx.beginPath(); ctx.moveTo(x, y + width * .16); ctx.quadraticCurveTo(x + side * width * .08, y - width * .03, x + side * width * .02, y - width * .2); ctx.stroke();
    ctx.fillStyle = palette.pink;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = Math.max(1.5, width * .014);
    ctx.beginPath(); ctx.arc(x - side * width * .065, y + width * .12, width * .09, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + side * width * .065, y + width * .12, width * .09, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

function drawCherryStamp(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, flip: number) {
  const palette = getFilterPalette();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(flip, 1);
  ctx.shadowColor = withOpacity(palette.ink, .2);
  ctx.shadowBlur = size * .18;
  ctx.shadowOffsetY = size * .05;
  ctx.fillStyle = palette.pink;
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = Math.max(1.2, size * .08);
  for (const offset of [-.22, .22]) {
    ctx.beginPath(); ctx.arc(size * offset, size * .14, size * .23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = palette.green;
  ctx.lineWidth = Math.max(1.2, size * .09);
  ctx.beginPath(); ctx.moveTo(-size * .2, -size * .02); ctx.quadraticCurveTo(0, -size * .4, size * .18, -size * .5); ctx.stroke();
  ctx.fillStyle = palette.green;
  ctx.beginPath(); ctx.ellipse(size * .18, -size * .42, size * .13, size * .07, -.52, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawCherryCheekStamps(ctx: CanvasRenderingContext2D, nose: FaceLandmark, leftCheek: FaceLandmark, rightCheek: FaceLandmark, size: number, rotation: number) {
  for (const [cheek, flip] of [[leftCheek, -1], [rightCheek, 1]] as const) {
    const x = cheek.x * .64 + nose.x * .36;
    const y = cheek.y * .64 + nose.y * .36 + size * .1;
    drawCherryStamp(ctx, x, y, size * .26, rotation, flip);
  }
}

function drawSweetBlush(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number) {
  const palette = getFilterPalette();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(1, .62);
  const glow = ctx.createRadialGradient(0, 0, size * .015, 0, 0, size * .28);
  glow.addColorStop(0, withOpacity(palette.pink, .58));
  glow.addColorStop(.58, withOpacity(palette.pink, .34));
  glow.addColorStop(1, withOpacity(palette.pink, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, size * .28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = withOpacity(palette.surface, .65);
  for (const offset of [-.09, 0, .09]) {
    ctx.beginPath();
    ctx.ellipse(size * offset, -size * .035, size * .025, size * .012, -.24, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCuteFreckles(ctx: CanvasRenderingContext2D, nose: FaceLandmark, leftCheek: FaceLandmark, rightCheek: FaceLandmark, size: number, rotation: number) {
  const palette = getFilterPalette();
  const ux = Math.cos(rotation), uy = Math.sin(rotation), vx = -uy, vy = ux;
  const dot = (x: number, y: number, radius: number, alpha: number) => {
    ctx.fillStyle = withOpacity(palette.ink, alpha);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  for (const cheek of [leftCheek, rightCheek]) {
    const towardNose = { x: cheek.x * .53 + nose.x * .47, y: cheek.y * .53 + nose.y * .47 + size * .11 };
    for (const [across, down, scale] of [[-.1, -.035, .023], [0, -.075, .018], [.105, -.025, .022], [-.055, .065, .019], [.06, .075, .017]] as const) {
      const x = towardNose.x + ux * size * across + vx * size * down;
      const y = towardNose.y + uy * size * across + vy * size * down;
      dot(x, y, Math.max(1.4, size * scale), .68);
    }
  }
  dot(nose.x - ux * size * .055 + vy * size * .11, nose.y - uy * size * .055 - vx * size * .11, Math.max(1.2, size * .016), .52);
  dot(nose.x + ux * size * .055 + vy * size * .11, nose.y + uy * size * .055 - vx * size * .11, Math.max(1.2, size * .016), .52);
}

function drawEyewear(ctx: CanvasRenderingContext2D, d: number, filterId: string, shadeColor: string) {
  if (filterId === "goggles") {
    const radius = d * .48;
    for (const side of [-1, 1]) {
      const lensX = side * d * .5;
      ctx.save();
      ctx.shadowColor = "rgba(73, 52, 133, .28)";
      ctx.shadowBlur = d * .12;
      ctx.shadowOffsetY = d * .04;
      const rim = ctx.createRadialGradient(lensX - radius * .32, -radius * .35, radius * .05, lensX, 0, radius);
      rim.addColorStop(0, "#fff9ff");
      rim.addColorStop(.18, "#c9f6ff");
      rim.addColorStop(.52, "#91c7f6");
      rim.addColorStop(1, "#8a6cd1");
      ctx.fillStyle = rim;
      ctx.strokeStyle = "#6951ad";
      ctx.lineWidth = Math.max(2.5, d * .038);
      ctx.beginPath(); ctx.arc(lensX, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.shadowColor = "transparent";
      const lens = ctx.createLinearGradient(lensX - radius, -radius, lensX + radius, radius);
      lens.addColorStop(0, "rgba(255, 255, 255, .75)");
      lens.addColorStop(.42, "rgba(182, 243, 255, .37)");
      lens.addColorStop(1, "rgba(142, 108, 227, .27)");
      ctx.fillStyle = lens;
      ctx.beginPath(); ctx.arc(lensX, 0, radius * .76, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "rgba(255, 255, 255, .9)";
      ctx.lineWidth = Math.max(2, d * .026);
      ctx.beginPath(); ctx.arc(lensX - radius * .18, -radius * .18, radius * .49, Math.PI * 1.06, Math.PI * 1.65); ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, .74)";
      ctx.beginPath(); ctx.arc(lensX + radius * .29, radius * .21, radius * .095, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(206, 187, 255, .9)";
      ctx.beginPath(); ctx.arc(lensX + side * radius * .68, -radius * .48, radius * .115, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, .72)";
      ctx.lineWidth = Math.max(1.2, d * .015);
      ctx.beginPath(); ctx.arc(lensX + side * radius * .65, -radius * .51, radius * .055, Math.PI * 1.05, Math.PI * 1.68); ctx.stroke();
    }
    ctx.strokeStyle = "#7256b9";
    ctx.lineWidth = Math.max(4, d * .075);
    ctx.beginPath(); ctx.moveTo(-d * .14, 0); ctx.quadraticCurveTo(0, d * .09, d * .14, 0); ctx.stroke();
    ctx.fillStyle = "#eadfff";
    ctx.beginPath(); ctx.arc(0, d * .035, d * .07, 0, Math.PI * 2); ctx.fill();
    return;
  }

  const palette = getFilterPalette();
  ctx.fillStyle = withOpacity(palette.ink, .88);
  ctx.strokeStyle = palette.ink;
  ctx.lineWidth = Math.max(3, d * .05);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * d * .12, -d * .16);
    ctx.quadraticCurveTo(side * d * .52, -d * .39, side * d * .9, -d * .27);
    ctx.lineTo(side * d * .7, d * .3);
    ctx.quadraticCurveTo(side * d * .41, d * .43, side * d * .1, d * .23);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = withOpacity(palette.yellow, .78);
    ctx.lineWidth = Math.max(1.4, d * .018);
    ctx.beginPath();
    ctx.moveTo(side * d * .23, -d * .13);
    ctx.quadraticCurveTo(side * d * .5, -d * .27, side * d * .7, -d * .18);
    ctx.stroke();
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = Math.max(3, d * .05);
  }
  ctx.beginPath(); ctx.moveTo(-d * .12, -d * .12); ctx.quadraticCurveTo(0, -d * .04, d * .12, -d * .12); ctx.stroke();
  ctx.lineWidth = Math.max(2, d * .028);
  ctx.beginPath(); ctx.moveTo(-d * .72, -d * .12); ctx.lineTo(-d * 1.12, -d * .2); ctx.moveTo(d * .72, -d * .12); ctx.lineTo(d * 1.12, -d * .2); ctx.stroke();
}

function drawFaceFilter(ctx: CanvasRenderingContext2D, face: FaceBox, filterId: string, shadeColor = "#f06f9f") {
  const { x, y, width: w, height: h } = face;
  const center = x + w / 2;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (filterId === "puppy") {
    ctx.save();
    ctx.translate(center, y + h * .08);
    drawPuppyEars(ctx, w * .58);
    ctx.restore();
    ctx.fillStyle = "#3c241c";
    ctx.beginPath(); ctx.ellipse(center, y + h * .61, w * .09, h * .06, 0, 0, Math.PI * 2); ctx.fill();
  } else if (filterId === "butterflies") {
    ctx.translate(center, y + h * .12);
    drawButterflyClips(ctx, w * .48);
  } else if (filterId === "kitty") {
    ctx.translate(center, y + h * .1);
    drawKittyEars(ctx, w * .68);
    ctx.strokeStyle = "#9d4868"; ctx.lineWidth = Math.max(3, w * .018);
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(center + side * w * .11, y + h * .61); ctx.lineTo(center + side * w * .56, y + h * .56); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(center + side * w * .11, y + h * .66); ctx.lineTo(center + side * w * .56, y + h * .73); ctx.stroke();
    }
  } else if (filterId === "bunny") {
    ctx.translate(center, y + h * .09);
    drawBunnyEars(ctx, w * .7);
  } else if (filterId === "goggles" || filterId === "sunnies") {
    ctx.translate(center, y + h * .42);
    drawEyewear(ctx, w * .48, filterId, shadeColor);
  } else if (filterId === "flower") {
    drawCherryCheekStamps(ctx, { x: center, y: y + h * .52 }, { x: center - w * .42, y: y + h * .6 }, { x: center + w * .42, y: y + h * .6 }, w, 0);
  } else if (filterId === "hearts") {
    drawPearlHalo(ctx, center, y - h * .02, w);
  } else if (filterId === "stars") {
    drawMoonPhases(ctx, center, y - h * .02, w);
  } else if (filterId === "blush") {
    drawSweetBlush(ctx, center - w * .25, y + h * .6, w, 0);
    drawSweetBlush(ctx, center + w * .25, y + h * .6, w, 0);
  } else if (filterId === "freckles") {
    drawCuteFreckles(ctx, { x: center, y: y + h * .52 }, { x: center - w * .45, y: y + h * .57 }, { x: center + w * .45, y: y + h * .57 }, w, 0);
  } else {
    const symbol = filterId === "hearts" ? "♥" : filterId === "stars" ? "★" : "♡";
    ctx.fillStyle = filterId === "hearts" ? "#e54879" : filterId === "stars" ? "#e2a31b" : "#e77896";
    ctx.font = `${Math.round(w * .27)}px serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${symbol}  ${symbol}  ${symbol}`, center, y - h * .16);
  }
  ctx.restore();
}
export function useCamera(facingMode: "user" | "environment", mirror: boolean, activeFilter?: string, filterSize = 1, photoFilter = "none", shadeColor = "#f06f9f") {
  const videoRef = useRef<HTMLVideoElement>(null),
    streamRef = useRef<MediaStream | null>(null),
    filterCanvasRef = useRef<HTMLCanvasElement>(null),
    requestRef = useRef(0),
    detectedFaceRef = useRef<FaceBox | null>(null),
    detectedFacesRef = useRef<FaceBox[]>([]),
    detectedLandmarksRef = useRef<FaceLandmark[][]>([]),
    smoothedLandmarksRef = useRef<FaceLandmark[][]>([]);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "denied" | "unsupported" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [faceBox, setFaceBox] = useState<LiveFaceBox | null>(null);
  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setFaceBox(null);
    setStatus("idle");
  }, []);
  const start = useCallback(async () => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      setErrorMessage("Camera access requires HTTPS (or localhost) and a supported browser.");
      setStatus("unsupported");
      return;
    }
    const request = ++requestRef.current;
    stop();
    setStatus("loading");
    setErrorMessage("");
    try {
      let stream: MediaStream;
      try {
        stream = await mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch (error) {
        // Some cameras reject ideal constraints. A plain video request is a
        // reliable fallback and still lets the booth operate normally.
        if ((error as DOMException).name !== "OverconstrainedError") throw error;
        stream = await mediaDevices.getUserMedia({ video: true, audio: false });
      }
      if (request !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setStatus("ready");
    } catch (e) {
      const name = (e as DOMException).name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setErrorMessage("Allow camera permission in your browser, then try again.");
        setStatus("denied");
      } else {
        setErrorMessage("We could not start this camera. Check that no other app is using it, then retry.");
        setStatus("error");
      }
    }
  }, [facingMode, stop]);
  useEffect(() => () => stop(), [stop]);
  useEffect(() => {
    if (status !== "ready") return;
    const video = videoRef.current;
    if (!video) return;
    let active = true;
    let frame = 0;
    let landmarker: FaceLandmarker | undefined;
    const renderOverlay = (landmarkSets: { x: number; y: number }[][]) => {
      const canvas = filterCanvasRef.current;
      if (!canvas) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!activeFilter || !landmarkSets.length) return;
      landmarkSets.forEach((landmarks) => drawTrackedFilter(ctx, landmarks, canvas.width, canvas.height, activeFilter, filterSize, shadeColor));
    };
    const renderFallbackOverlay = () => {
      if (!active) return;
      const canvas = filterCanvasRef.current;
      if (!canvas || !video.videoWidth || !video.videoHeight) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!activeFilter) return;
      drawFaceFilter(
        ctx,
        scaleFaceBox(
          { x: canvas.width * .3, y: canvas.height * .18, width: canvas.width * .4, height: canvas.height * .48 },
          filterSize,
        ),
        activeFilter,
        shadeColor,
      );
    };
    const startTracking = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm");
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            delegate: "CPU",
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          },
          runningMode: "VIDEO",
          numFaces: 10,
        });
        const track = () => {
          if (!active || !landmarker || !video.videoWidth) return;
          const landmarkSets = landmarker.detectForVideo(video, performance.now()).faceLandmarks ?? [];
          if (landmarkSets.length) {
            const smoothedSets = landmarkSets.map((landmarks, index) => smoothLandmarks(smoothedLandmarksRef.current[index] ?? null, landmarks, .35));
            smoothedLandmarksRef.current = smoothedSets;
            detectedLandmarksRef.current = smoothedSets;
            renderOverlay(smoothedSets);
            const primary = smoothedSets[0];
            const xs = primary.map((point) => point.x);
            const ys = primary.map((point) => point.y);
            const raw = {
              x: Math.min(...xs) * video.videoWidth,
              y: Math.min(...ys) * video.videoHeight,
              width: (Math.max(...xs) - Math.min(...xs)) * video.videoWidth,
              height: (Math.max(...ys) - Math.min(...ys)) * video.videoHeight,
            };
            detectedFaceRef.current = raw;
            detectedFacesRef.current = smoothedSets.map((face) => {
              const faceXs = face.map((point) => point.x);
              const faceYs = face.map((point) => point.y);
              return { x: Math.min(...faceXs) * video.videoWidth, y: Math.min(...faceYs) * video.videoHeight, width: (Math.max(...faceXs) - Math.min(...faceXs)) * video.videoWidth, height: (Math.max(...faceYs) - Math.min(...faceYs)) * video.videoHeight };
            });
            const bounds = video.getBoundingClientRect();
            const scale = Math.max(bounds.width / video.videoWidth, bounds.height / video.videoHeight);
            const visibleX = mirror ? video.videoWidth - raw.x - raw.width : raw.x;
            setFaceBox({
              left: (bounds.width - video.videoWidth * scale) / 2 + (visibleX + raw.width / 2) * scale,
              top: (bounds.height - video.videoHeight * scale) / 2 + (raw.y + raw.height / 2) * scale,
              width: raw.width * scale,
              height: raw.height * scale,
            });
          } else {
            smoothedLandmarksRef.current = [];
            detectedLandmarksRef.current = [];
            detectedFacesRef.current = [];
            setFaceBox(null);
            renderFallbackOverlay();
          }
          frame = window.requestAnimationFrame(track);
        };
        track();
      } catch {
        // MediaPipe loads its model from a remote host. Keep filters usable
        // (and visibly selected) when that model is blocked or unavailable.
        renderFallbackOverlay();
      }
    };
    void startTracking();
    return () => { active = false; window.cancelAnimationFrame(frame); landmarker?.close(); };
  }, [status, mirror, activeFilter, filterSize, shadeColor]);
  useEffect(() => {
    if (activeFilter) return;
    const canvas = filterCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [activeFilter]);
  const capture = useCallback(async (faceFilter?: string) => {
    const v = videoRef.current;
    if (!v?.videoWidth) return null;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const x = c.getContext("2d")!;
    if (mirror) {
      x.translate(c.width, 0);
      x.scale(-1, 1);
    }
    x.filter = photoFilter === "none" ? "none" : photoFilter;
    x.drawImage(v, 0, 0);
    x.filter = "none";
    if (faceFilter) {
      if (detectedLandmarksRef.current.length) {
        detectedLandmarksRef.current.forEach((landmarks) => drawTrackedFilter(x, landmarks, c.width, c.height, faceFilter, filterSize, shadeColor));
        return c.toDataURL("image/jpeg", 0.94);
      }
      const Detector = (window as Window & { FaceDetector?: FaceDetectorConstructor }).FaceDetector;
      let faces: FaceBox[] = detectedFacesRef.current.length ? detectedFacesRef.current : [detectedFaceRef.current ?? { x: c.width * .3, y: c.height * .18, width: c.width * .4, height: c.height * .48 }];
      if (!detectedFacesRef.current.length && Detector) {
        try {
          const result = await new Detector({ fastMode: true, maxDetectedFaces: 10 }).detect(v);
          if (result.length) faces = result.map((item) => item.boundingBox);
        } catch { /* fall back to the centered face guide */ }
      }
      faces.forEach((face) => drawFaceFilter(x, scaleFaceBox(face, filterSize), faceFilter, shadeColor));
    }
    return c.toDataURL("image/jpeg", 0.94);
  }, [mirror, filterSize, photoFilter, shadeColor]);
  const capturePhotoWithFilter = capture;
  return { videoRef, filterCanvasRef, streamRef, status, errorMessage, faceBox, start, stop, capture, capturePhotoWithFilter };
}
