import {
  Aperture,
  Camera,
  CameraOff,
  FlipHorizontal,
  ImagePlus,
  Lightbulb,
  RotateCcw,
  SlidersHorizontal,
  Timer,
  Upload,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCamera } from "../camera";
import { filters, frames, layouts } from "../catalog";
import { BottomSheet, Button, Shell, SectionTitle } from "../components";
import { useBooth } from "../store";
import type { BoothMode } from "../types";
export default function Booth() {
  const { session, setSession } = useBooth(),
    layout = layouts.find((x) => x.id === session.layoutId) ?? layouts[0],
    activeFrame = frames.find((x) => x.id === session.frameId),
    visibleLayouts = session.mode === "cam"
      ? layouts.filter((item) => item.category === "4R" || item.category === "Pocket")
      : layouts.filter((item) => item.category === "Strip");
  const [facing, setFacing] = useState<"user" | "environment">("user"),
    [timer, setTimer] = useState(3),
    [count, setCount] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [multi, setMulti] = useState(false),
    [continuous, setContinuous] = useState(false),
    [autoTimer, setAutoTimer] = useState(2),
    [boomerang, setBoomerang] = useState(false),
    [flash, setFlash] = useState(false),
    [filterPicker, setFilterPicker] = useState(false),
    [mobileToolsOpen, setMobileToolsOpen] = useState(false),
    [formatRail, setFormatRail] = useState({ atStart: true, atEnd: false }),
    [coverRail, setCoverRail] = useState({ atStart: true, atEnd: false }),
    file = useRef<HTMLInputElement>(null),
    layoutRail = useRef<HTMLDivElement>(null),
    coverRailRef = useRef<HTMLDivElement>(null),
    nav = useNavigate(),
    [params] = useSearchParams();
  const cam = useCamera(facing, session.mirror);
  const updateFormatRail = () => {
    const rail = layoutRail.current;
    if (!rail) return;
    setFormatRail({
      atStart: rail.scrollLeft <= 2,
      atEnd: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2,
    });
  };
  const scrollFormats = (direction: -1 | 1) => {
    const rail = layoutRail.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(180, rail.clientWidth * 0.78), behavior: "smooth" });
  };
  const updateCoverRail = () => {
    const rail = coverRailRef.current;
    if (!rail) return;
    setCoverRail({ atStart: rail.scrollLeft <= 2, atEnd: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2 });
  };
  const scrollCoverArt = (direction: -1 | 1) => {
    const rail = coverRailRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(150, rail.clientWidth * .75), behavior: "smooth" });
  };
  useEffect(() => {
    updateFormatRail();
    updateCoverRail();
    window.addEventListener("resize", updateFormatRail);
    window.addEventListener("resize", updateCoverRail);
    return () => {
      window.removeEventListener("resize", updateFormatRail);
      window.removeEventListener("resize", updateCoverRail);
    };
  }, []);
  useEffect(() => {
    if (!filterPicker) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterPicker(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [filterPicker]);
  useEffect(() => {
    const id = params.get("frame");
    const f = frames.find((x) => x.id === id);
    if (f) setSession({ mode: "framed", frameId: f.id, layoutId: f.layoutId });
  }, []);
  useEffect(() => {
    if (cam.status === "ready") void cam.start();
  }, [facing]);
  const addShot = (src: string) => {
    const next = [...session.shots];
    const empty = next.findIndex((x) => !x);
    if (empty >= 0) next[empty] = src;
    else if (next.length < layout.slots.length) next.push(src);
    setSession({ shots: next });
  };
  async function snap() {
    if (busy) return;
    setBusy(true);
    try {
      const remaining = layout.slots.length - useBooth.getState().session.shots.length;
      const photoCount = continuous ? Math.max(1, remaining) : 1;
      for (let photoIndex = 0; photoIndex < photoCount; photoIndex++) {
        if (useBooth.getState().session.shots.length >= layout.slots.length) break;
        // Auto-click uses the same timer setting for every pose. Previously
        // follow-up shots were hard-coded to two seconds.
        const delay = continuous ? autoTimer : timer;
        for (let second = delay; second > 0; second--) {
          setCount(second);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        setCount(null);
        if (flash) document.body.classList.add("flash");
        const src = cam.capture();
        setTimeout(() => document.body.classList.remove("flash"), 220);
        if (!src) break;

        const state = useBooth.getState();
        const slot = state.session.shots.length;
        state.setSession({ shots: [...state.session.shots, src] });
        if (multi) {
          const captures: string[] = [];
          for (let extraIndex = 0; extraIndex < 2; extraIndex++) {
            await new Promise((resolve) => setTimeout(resolve, 180));
            const extra = cam.capture();
            if (extra) captures.push(extra);
          }
          const extras = [...useBooth.getState().session.extras];
          extras[slot] = captures;
          useBooth.getState().setSession({ extras });
        }
        if (boomerang && cam.streamRef.current && typeof MediaRecorder !== "undefined") {
          try {
            const chunks: Blob[] = [];
            const recorder = new MediaRecorder(cam.streamRef.current);
            recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
            recorder.onstop = () => useBooth.getState().setSession({ boomerang: new Blob(chunks, { type: recorder.mimeType }) });
            recorder.start();
            setTimeout(() => recorder.stop(), 950);
          } catch { /* still capture remains usable */ }
        }
      }
    } finally {
      setCount(null);
      setBusy(false);
    }
  }
  async function upload(files: FileList | null) {
    if (!files) return;
    const chosen = Array.from(files).slice(
      0,
      layout.slots.length - session.shots.length,
    );
    const urls = await Promise.all(
      chosen.map(
        (f) =>
          new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.onerror = reject;
            r.readAsDataURL(f);
          }),
      ),
    );
    setSession({ shots: [...session.shots, ...urls] });
  }
  function changeLayout(id: string) {
    const next = layouts.find((x) => x.id === id)!;
    if (
      session.shots.length > next.slots.length &&
      !confirm("This layout has fewer spaces. Remove the extra photos?")
    )
      return;
    setSession({
      layoutId: id,
      shots: session.shots.slice(0, next.slots.length),
    });
  }
  const done = () =>
    session.shots.length >= layout.slots.length && nav("/edit");
  return (
    <Shell>
      <section className={`page booth-page ${flash && facing === "user" ? "ringlight-active" : ""}`}>
        <SectionTitle
          title="Start a roll"
          copy="Pick a format, choose a film look, and make some evidence."
        />
        <div className="booth-grid">
          <div>
            <div className="camera-ring">
              <div className={`camera-stage ${flash && facing === "user" ? "ring-light" : ""}`} style={activeFrame ? { background: `linear-gradient(145deg, ${activeFrame.colors[1]} 0%, ${activeFrame.colors[0]} 58%, ${activeFrame.colors[2]} 150%)` } : undefined}>
              <video
                ref={cam.videoRef}
                muted
                playsInline
                className={session.mirror ? "mirror" : ""}
              />
              {cam.status !== "ready" && (
                <div className="camera-empty">
                  <Aperture />
                  <h2>
                    {cam.status === "loading"
                      ? "Opening camera…"
                      : cam.status === "denied"
                      ? "Camera permission needed"
                      : cam.status === "unsupported"
                        ? "Camera is unavailable"
                        : cam.status === "error"
                          ? "Camera could not start"
                      : "Your roll is ready"}
                  </h2>
                  <p>
                    {cam.status === "denied" || cam.status === "unsupported" || cam.status === "error"
                      ? cam.errorMessage
                      : "Nothing gets uploaded. Everything develops here."}
                  </p>
                  <Button kind="primary" onClick={() => void cam.start()} disabled={cam.status === "loading"}>
                    {cam.status === "loading" ? "Opening…" : cam.status === "idle" ? "Open camera" : "Try camera again"}
                  </Button>
                </div>
              )}
              {count && <strong className="countdown">{count}</strong>}
              <div className="camera-tools">
                <button
                  onClick={() =>
                    setTimer(
                      timer === 0 ? 3 : timer === 3 ? 5 : timer === 5 ? 10 : 0,
                    )
                  }
                >
                  <Timer />
                  {timer ? `${timer}s` : "Off"}
                </button>
                <button
                  onClick={() =>
                    setFacing((x) => (x === "user" ? "environment" : "user"))
                  }
                >
                  <Camera />
                  <span>Flip</span>
                </button>
                <button
                  className={session.mirror ? "on" : ""}
                  onClick={() => setSession({ mirror: !session.mirror })}
                >
                  <FlipHorizontal />
                  <span>Mirror</span>
                </button>
                <button
                  className={flash ? "on" : ""}
                  onClick={() => setFlash(!flash)}
                  aria-label={facing === "user" ? "Toggle ring light" : "Toggle flash"}
                >
                  <Zap />
                  <span>{facing === "user" ? "Ring light" : "Flash"}</span>
                </button>
              </div>
              </div>
            </div>
            <div className="capture-toggles">
              <button
                className={multi ? "on" : ""}
                onClick={() => setMulti(!multi)}
              >
                <span /> Multi-capture{" "}
                <b>{multi ? "ON · +2" : "OFF · 2 SHOTS"}</b>
              </button>
              <button
                className={continuous ? "on" : ""}
                onClick={() => setContinuous(!continuous)}
                title="Take every remaining pose automatically"
              >
                <span /> Auto-click <b>{continuous ? "ON" : "OFF"}</b>
              </button>
              {continuous && (
                <button
                  className="auto-delay"
                  onClick={() => setAutoTimer((value) => value === 1 ? 2 : value === 2 ? 3 : value === 3 ? 5 : value === 5 ? 10 : 1)}
                  title="Change the delay between automatic photos"
                >
                  <span /> Delay <b>{autoTimer}s</b>
                </button>
              )}
              <button
                className={boomerang ? "on" : ""}
                onClick={() => setBoomerang(!boomerang)}
              >
                <span /> Boomerang <b>{boomerang ? "ON" : "OFF"}</b>
              </button>
            </div>
            <div className="shutter-row">
              <Button onClick={cam.status === "ready" ? cam.stop : cam.start}>
                {cam.status === "ready" ? (
                  <>
                    <CameraOff /> Cam off
                  </>
                ) : (
                  <>
                    <Camera /> Cam on
                  </>
                )}
              </Button>
              <Button onClick={() => file.current?.click()}>
                <Upload /> Upload
              </Button>
              <input
                ref={file}
                hidden
                multiple
                type="file"
                accept="image/*"
                onChange={(e) => upload(e.target.files)}
              />
              <button
                className="shutter"
                onClick={snap}
                disabled={cam.status !== "ready" || busy}
                aria-label="Take photo"
              >
                <span />
                <small>{layout.slots.length - session.shots.length}</small>
              </button>
              <Button
                onClick={() =>
                  setSession({
                    shots: [],
                    extras: [],
                    overlays: [],
                    filterId: "none",
                    effectId: "none",
                  })
                }
              >
                <RotateCcw /> Reset
              </Button>
              <Button
                kind="primary"
                onClick={done}
                disabled={session.shots.length < layout.slots.length}
              >
                Done
              </Button>
            </div>
            <div className="shot-tray">
              {layout.slots.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (session.shots[i])
                      setSession({
                        shots: session.shots.filter((_, j) => j !== i),
                      });
                  }}
                >
                  {session.shots[i] ? (
                    <img src={session.shots[i]} />
                  ) : (
                    <ImagePlus />
                  )}
                  <span>{i + 1}</span>
                </button>
              ))}
            </div>
            <button className="mobile-tool-launch" type="button" onClick={() => setMobileToolsOpen(true)}>
              <SlidersHorizontal />
              <span><b>Style this roll</b><small>{filters.find((f) => f.id === session.filterId)?.name ?? "None"} · {layout.name}</small></span>
              <i>+</i>
            </button>
          </div>
          <BottomSheet className="booth-panel" title="Roll settings" open={mobileToolsOpen} onClose={() => setMobileToolsOpen(false)}>
            <Tool title="Filter">
              <button className="filter-launch" onClick={() => setFilterPicker(true)}>
                <span className="filter-launch-thumb" style={{ filter: filters.find((f) => f.id === session.filterId)?.css }} />
                <span><b>Choose a filter</b><small>{filters.find((f) => f.id === session.filterId)?.name ?? "None"}</small></span>
                <i>›</i>
              </button>
            </Tool>
            <Tool title="Mode">
              <div className="mode-grid">
                {(
                  [
                    ["strip", "Photo strip", "Clean and classic"],
                    ["framed", "Magazine cover", "Illustrated art"],
                    ["cam", "Contact sheet", "Camera layouts"],
                  ] as [BoothMode, string, string][]
                ).map(([id, n, h]) => (
                  <button
                    key={id}
                    className={session.mode === id ? "selected" : ""}
                    onClick={() => setSession({ mode: id, layoutId: id === "strip" ? "strip2" : id === "cam" ? "grid4" : session.layoutId })}
                  >
                    <span className={`mode-preview mode-preview-${id}`} aria-hidden="true">
                      {id === "strip" ? <><i /><i /></> : id === "cam" ? <><i /><i /><i /><i /></> : id === "framed" ? <b>✦</b> : <b>＋</b>}
                    </span>
                    <b>{n}</b>
                    <small>{h}</small>
                  </button>
                ))}
              </div>
            </Tool>
            {session.mode === "framed" ? (
              <Tool title="Cover art">
                <div className="cover-art-rail">
                  <button className="cover-scroll-button left" type="button" aria-label="Show previous covers" disabled={coverRail.atStart} onClick={() => scrollCoverArt(-1)}>‹</button>
                  <div ref={coverRailRef} className="mini-frames" aria-label="Scroll through cover art" onScroll={updateCoverRail}>
                    {frames.map((f) => (
                    <button
                      key={f.id}
                      className={session.frameId === f.id ? "selected" : ""}
                      onClick={() =>
                        setSession({
                          frameId: f.id,
                          layoutId: f.layoutId,
                          mode: "framed",
                          theme: {
                            ...session.theme,
                            frame: f.colors[0],
                            accent: f.colors[1],
                            label: f.colors[2],
                          },
                        })
                      }
                      style={{ background: f.colors[0] }}
                    >
                      <i>{f.motif}</i>
                      <small>{f.name}</small>
                    </button>
                    ))}
                  </div>
                  <button className="cover-scroll-button right" type="button" aria-label="Show more covers" disabled={coverRail.atEnd} onClick={() => scrollCoverArt(1)}>›</button>
                </div>
              </Tool>
            ) : (
              <Tool title="Print format">
                <div className="format-rail-wrap">
                  <button className="format-scroll-button left" type="button" aria-label="Show previous print formats" disabled={formatRail.atStart} onClick={() => scrollFormats(-1)}>‹</button>
                  <div ref={layoutRail} className="layout-grid layout-scroll" aria-label="Scroll through print formats" onScroll={updateFormatRail}>
                    {visibleLayouts.map((l) => (
                      <button
                        key={l.id}
                        className={session.layoutId === l.id ? "selected" : ""}
                        onClick={() => changeLayout(l.id)}
                      >
                        <div className="layout-glyph">
                          {l.slots.map((s, i) => (
                            <i
                              key={i}
                              style={{
                                left: `${s.x * 100}%`,
                                top: `${s.y * 100}%`,
                                width: `${s.w * 100}%`,
                                height: `${s.h * 100}%`,
                              }}
                            />
                          ))}
                        </div>
                        <b>{l.name}</b>
                        <small>{l.description}</small>
                      </button>
                    ))}
                  </div>
                  <button className="format-scroll-button right" type="button" aria-label="Show more print formats" disabled={formatRail.atEnd} onClick={() => scrollFormats(1)}>›</button>
                </div>
              </Tool>
            )}
          </BottomSheet>
        </div>
        {filterPicker && (
          <div className="filter-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFilterPicker(false); }}>
            <section className="filter-picker" role="dialog" aria-modal="true" aria-labelledby="filter-picker-title">
              <header>
                <h2 id="filter-picker-title">Choose a Filter</h2>
                <button type="button" aria-label="Close filter picker" onClick={() => setFilterPicker(false)}>×</button>
              </header>
              <div className="filter-picker-grid">
                {filters.map((f) => (
                  <button key={f.id} className={session.filterId === f.id ? "selected" : ""} onClick={() => { setSession({ filterId: f.id }); setFilterPicker(false); }}>
                    <span className="filter-picker-thumb" style={{ filter: f.css }} />
                    <b>{f.name}</b>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </section>
    </Shell>
  );
}
function Tool({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="tool">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
