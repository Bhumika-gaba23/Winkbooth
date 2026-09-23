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
  if (filterId === "kitty") {
    ctx.translate(forehead.x, forehead.y);
    ctx.rotate(rotation);
    const earHeight = d * .78;
    ctx.fillStyle = "#e47c9c";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * d * .88, d * .12);
      ctx.lineTo(side * d * .54, -earHeight);
      ctx.lineTo(side * d * .22, d * .08);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffd3e1";
      ctx.beginPath();
      ctx.moveTo(side * d * .74, d * .02);
      ctx.lineTo(side * d * .54, -earHeight * .68);
      ctx.lineTo(side * d * .37, d * .04);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e47c9c";
    }
    ctx.strokeStyle = "#9d4868";
    ctx.lineWidth = Math.max(2, d * .025);
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * d * .12, d * 1.18); ctx.lineTo(side * d * 1.02, d * 1.08); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(side * d * .12, d * 1.24); ctx.lineTo(side * d * 1.02, d * 1.32); ctx.stroke();
    }
  } else if (filterId === "goggles" || filterId === "sunnies") {
    const radius = d * .43;
    ctx.translate(eyes.x, eyes.y);
    ctx.rotate(rotation);
    ctx.strokeStyle = shadeColor;
    ctx.fillStyle = `${shadeColor}${filterId === "goggles" ? "52" : "cc"}`;
    ctx.lineWidth = Math.max(4, d * .08);
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(side * d * .5, 0, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-d * .08, 0); ctx.lineTo(d * .08, 0); ctx.stroke();
  } else if (filterId === "blush" || filterId === "freckles") {
    ctx.fillStyle = filterId === "blush" ? "rgba(235,88,137,.7)" : "rgba(150,81,58,.72)";
    for (const cheek of [leftCheek, rightCheek]) {
      ctx.beginPath(); ctx.ellipse(cheek.x, cheek.y, d * .2, d * .1, rotation, 0, Math.PI * 2); ctx.fill();
    }
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

function drawFaceFilter(ctx: CanvasRenderingContext2D, face: FaceBox, filterId: string, shadeColor = "#f06f9f") {
  const { x, y, width: w, height: h } = face;
  const center = x + w / 2;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (filterId === "puppy") {
    ctx.fillStyle = "#7a4a35";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(center + side * w * .35, y - h * .06, w * .18, h * .28, side * .35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#3c241c";
    ctx.beginPath(); ctx.ellipse(center, y + h * .61, w * .09, h * .06, 0, 0, Math.PI * 2); ctx.fill();
  } else if (filterId === "kitty") {
    ctx.fillStyle = "#e47c9c";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(center + side * w * .43, y + h * .1);
      ctx.lineTo(center + side * w * .25, y - h * .28);
      ctx.lineTo(center + side * w * .08, y + h * .07);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = "#9d4868"; ctx.lineWidth = Math.max(3, w * .018);
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(center + side * w * .11, y + h * .61); ctx.lineTo(center + side * w * .56, y + h * .56); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(center + side * w * .11, y + h * .66); ctx.lineTo(center + side * w * .56, y + h * .73); ctx.stroke();
    }
  } else if (filterId === "bunny") {
    ctx.fillStyle = "#f5a6c2";
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(center + side * w * .27, y - h * .24, w * .12, h * .34, side * .1, 0, Math.PI * 2); ctx.fill();
    }
  } else if (filterId === "goggles" || filterId === "sunnies") {
    const lensY = y + h * .42;
    const lensX = w * .23;
    const radius = w * .19;
    ctx.lineWidth = Math.max(5, w * .045);
    ctx.strokeStyle = shadeColor;
    ctx.fillStyle = `${shadeColor}${filterId === "goggles" ? "52" : "cc"}`;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.arc(center + side * lensX, lensY, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(center - lensX + radius, lensY); ctx.lineTo(center + lensX - radius, lensY); ctx.stroke();
    if (filterId === "sunnies") {
      ctx.strokeStyle = "#dca51d"; ctx.lineWidth = Math.max(3, w * .02);
      ctx.beginPath(); ctx.moveTo(center - w * .45, lensY - h * .04); ctx.lineTo(center - lensX - radius, lensY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(center + lensX + radius, lensY); ctx.lineTo(center + w * .45, lensY - h * .04); ctx.stroke();
    }
  } else if (filterId === "flower") {
    const colors = ["#f05b8d", "#f3b33d", "#8056b8", "#f48fbd", "#61b69d"];
    for (let index = 0; index < 5; index++) {
      const flowerX = center + (index - 2) * w * .2;
      const flowerY = y - h * .08 - Math.abs(index - 2) * h * .025;
      ctx.fillStyle = colors[index];
      for (let petal = 0; petal < 5; petal++) {
        const angle = (Math.PI * 2 * petal) / 5;
        ctx.beginPath(); ctx.ellipse(flowerX + Math.cos(angle) * w * .035, flowerY + Math.sin(angle) * w * .035, w * .045, w * .026, angle, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#ffe67a"; ctx.beginPath(); ctx.arc(flowerX, flowerY, w * .025, 0, Math.PI * 2); ctx.fill();
    }
  } else if (filterId === "freckles") {
    ctx.fillStyle = "rgba(150,81,58,.72)";
    for (const side of [-1, 1]) for (let dot = 0; dot < 4; dot++) {
      ctx.beginPath(); ctx.arc(center + side * (w * (.14 + dot * .045)), y + h * (.61 + (dot % 2) * .035), Math.max(2, w * .014), 0, Math.PI * 2); ctx.fill();
    }
  } else {
    const symbol = filterId === "hearts" ? "♥" : filterId === "stars" ? "★" : "♡";
    ctx.fillStyle = filterId === "hearts" ? "#e54879" : filterId === "stars" ? "#e2a31b" : "#e77896";
    ctx.font = `${Math.round(w * .27)}px serif`;
    ctx.textAlign = "center";
    if (filterId === "blush") {
      ctx.fillText(symbol, center - w * .28, y + h * .66);
      ctx.fillText(symbol, center + w * .28, y + h * .66);
    } else ctx.fillText(`${symbol}  ${symbol}  ${symbol}`, center, y - h * .16);
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
          }
          frame = window.requestAnimationFrame(track);
        };
        track();
      } catch { /* the non-tracking center guide remains available if assets cannot load */ }
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
      faces.forEach((face) => drawFaceFilter(x, face, faceFilter, shadeColor));
    }
    return c.toDataURL("image/jpeg", 0.94);
  }, [mirror, filterSize, photoFilter, shadeColor]);
  const capturePhotoWithFilter = capture;
  return { videoRef, filterCanvasRef, streamRef, status, errorMessage, faceBox, start, stop, capture, capturePhotoWithFilter };
}
