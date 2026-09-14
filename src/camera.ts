import { useCallback, useEffect, useRef, useState } from "react";
export function useCamera(facingMode: "user" | "environment", mirror: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null),
    streamRef = useRef<MediaStream | null>(null),
    requestRef = useRef(0);
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "denied" | "unsupported" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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
  const capture = useCallback(() => {
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
    x.drawImage(v, 0, 0);
    return c.toDataURL("image/jpeg", 0.94);
  }, [mirror]);
  return { videoRef, streamRef, status, errorMessage, start, stop, capture };
}
