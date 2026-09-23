import { ChevronLeft, ChevronRight, Copy, Redo2, RotateCcw, RotateCw, SlidersHorizontal, Trash2, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { effects, filters, frames, layouts } from "../catalog";
import { BottomSheet, Button, Shell, SectionTitle } from "../components";
import { compose } from "../render";
import { useBooth } from "../store";
import type { CaptureSession, OverlayLayer } from "../types";
const stickers = {
  Doodles: ["☻", "☼", "✎", "☮", "⚡", "♟", "⌣", "!"],
  Sparkle: ["✦", "✧", "⋆", "⁕", "✶", "✷", "✹", "✺"],
  Shapes: ["◆", "●", "■", "▲", "◇", "○", "□", "△"],
  Classic: ["✦", "☻", "✿", "☁", "☀", "♬"],
  Coquette: ["୨୧", "🎀", "♡", "🦢", "🕯️", "🫧"],
  Hearts: ["♥", "♡", "💕", "💛", "💗", "💌"],
  Food: ["🍒", "🍓", "🍰", "🍋", "🧀", "🍬"],
};
const faceFilters = [
  { name: "Puppy ears", value: "⌒⌒", color: "#7a4a35", x: .5, y: .26, scale: 2.1 },
  { name: "Kitty ears", value: "▲  ▲", color: "#e47c9c", x: .5, y: .25, scale: 1.6 },
  { name: "Bunny ears", value: "∩  ∩", color: "#f5a6c2", x: .5, y: .22, scale: 2.1 },
  { name: "Heart crown", value: "♥  ♥  ♥", color: "#e54879", x: .5, y: .22, scale: 1.15 },
  { name: "Star crown", value: "★  ★  ★", color: "#e2a31b", x: .5, y: .22, scale: 1.1 },
  { name: "Sweet blush", value: "♡     ♡", color: "#e77896", x: .5, y: .57, scale: 1.15 },
];
export default function Edit() {
  const { session, setSession } = useBooth(),
    nav = useNavigate(),
    [preview, setPreview] = useState(""),
    [tab, setTab] = useState("Filter"),
    [selected, setSelected] = useState<string>(),
    [history, setHistory] = useState<CaptureSession[]>([]),
    [future, setFuture] = useState<CaptureSession[]>([]),
    [mobileToolsOpen, setMobileToolsOpen] = useState(true),
    [frameRailProgress, setFrameRailProgress] = useState(0);
  const layout = layouts.find((item) => item.id === session.layoutId) ?? layouts[0];
  const previewWidth = Math.min(540, 700 * (layout.width / layout.height));
  const previewRef = useRef<HTMLDivElement>(null);
  const filterRailRef = useRef<HTMLDivElement>(null);
  const frameRailRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    start: CaptureSession;
    moved: boolean;
  } | null>(null);
  useEffect(() => {
    compose({ ...session, overlays: [] }, 0.55).then((c) =>
      setPreview(c.toDataURL()),
    );
  }, [session]);
  const change = (p: Partial<CaptureSession>) => {
    setHistory((h) => [...h.slice(-49), session]);
    setFuture([]);
    setSession(p);
  };
  const syncFrameRail = () => {
    const rail = frameRailRef.current;
    if (!rail) return;
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    setFrameRailProgress(maxScroll > 0 ? (rail.scrollLeft / maxScroll) * 100 : 0);
  };
  const moveFrameRail = (progress: number) => {
    const rail = frameRailRef.current;
    if (!rail) return;
    const maxScroll = rail.scrollWidth - rail.clientWidth;
    rail.scrollTo({ left: (progress / 100) * maxScroll, behavior: "smooth" });
    setFrameRailProgress(progress);
  };
  const add = (kind: "sticker" | "text", value: string) =>
    change({
      overlays: [
        ...session.overlays,
        {
          id: crypto.randomUUID(),
          kind,
          value,
          x: 0.5,
          y: 0.5,
          scale: 1,
          rotation: 0,
          opacity: 1,
          color: "#5d3d24",
          font: "display",
          size: 42,
        },
      ],
    });
  const addFaceFilter = (filter: (typeof faceFilters)[number]) =>
    change({
      overlays: [
        ...session.overlays,
        {
          id: crypto.randomUUID(),
          kind: "sticker",
          value: filter.value,
          x: filter.x,
          y: filter.y,
          scale: filter.scale,
          rotation: 0,
          opacity: 1,
          color: filter.color,
          font: "sans",
          size: 42,
        },
      ],
    });
  const layer = session.overlays.find((x) => x.id === selected);
  const patchLayer = (p: Partial<OverlayLayer>) =>
    change({
      overlays: session.overlays.map((x) =>
        x.id === selected ? { ...x, ...p } : x,
      ),
    });
  const undo = () => {
    const last = history.at(-1);
    if (last) {
      setFuture((f) => [session, ...f]);
      setHistory((h) => h.slice(0, -1));
      setSession(last);
    }
  };
  const redo = () => {
    const next = future[0];
    if (next) {
      setHistory((h) => [...h, session]);
      setFuture((f) => f.slice(1));
      setSession(next);
    }
  };
  const moveLayer = (
    id: string,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    const bounds = previewRef.current?.getBoundingClientRect();
    if (!bounds || !dragRef.current) return;
    const x = Math.max(0.03, Math.min(0.97, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0.03, Math.min(0.97, (event.clientY - bounds.top) / bounds.height));
    const state = useBooth.getState();
    state.setSession({
      overlays: state.session.overlays.map((item) =>
        item.id === id ? { ...item, x, y } : item,
      ),
    });
    dragRef.current.moved = true;
  };
  const finishDrag = () => {
    const drag = dragRef.current;
    if (drag?.moved) {
      setHistory((items) => [...items.slice(-49), drag.start]);
      setFuture([]);
    }
    dragRef.current = null;
  };
  if (!session.shots.length)
    return (
      <Shell>
        <section className="page">
          <SectionTitle
            title="Nothing to style yet"
            copy="Take or upload your photos first."
          />
          <Button kind="primary" onClick={() => nav("/booth")}>
            Enter the booth
          </Button>
        </section>
      </Shell>
    );
  return (
    <Shell>
      <section className="page edit-page">
        <div className="title-row">
          <div className="edit-title-group">
            <SectionTitle
              title="Style your strip"
              copy="Filters, frames, stickers, words."
            />
            <div className="edit-ritual" aria-label="Editing tips">
              <span><i>1</i> Pick a mood</span>
              <span><i>2</i> Make it yours</span>
              <span><i>3</i> Take it home</span>
            </div>
          </div>
          <div className="edit-header-actions">
            <Button onClick={() => nav("/gallery")}>
              Gallery
            </Button>
            <Button onClick={() => nav("/export")} kind="primary">
              Export →
            </Button>
          </div>
        </div>
        <div className="edit-grid">
          <div>
            <div className="preview-wrap" ref={previewRef} style={{ width: `min(100%, ${previewWidth}px)` }}>
              <div className="canvas-stamp" aria-hidden="true"><i>✦</i><span>Wink lab<br /><b>live canvas</b></span></div>
              <div className="canvas-doodle canvas-doodle-a" aria-hidden="true">♡</div>
              <div className="canvas-doodle canvas-doodle-b" aria-hidden="true">✿</div>
              <img src={preview} />
              <div className="overlay-hit">
                {session.overlays.map((l) => (
                  <button
                    key={l.id}
                    className={selected === l.id ? "selected" : ""}
                    onClick={() => setSelected(l.id)}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      dragRef.current = { id: l.id, start: session, moved: false };
                      setSelected(l.id);
                    }}
                    onPointerMove={(event) => {
                      if (dragRef.current?.id === l.id) moveLayer(l.id, event);
                    }}
                    onPointerUp={finishDrag}
                    onPointerCancel={finishDrag}
                    style={{
                      left: `${l.x * 100}%`,
                      top: `${l.y * 100}%`,
                      transform: `translate(-50%,-50%) rotate(${l.rotation}deg) scale(${l.scale})`,
                      opacity: l.opacity,
                      color: l.color,
                      fontFamily: l.font === "sans" ? "DM Sans" : "Fraunces",
                      fontSize:
                        l.kind === "text" ? `${(l.size ?? 36) / 2}px` : "30px",
                    }}
                  >
                    {l.value}
                  </button>
                ))}
              </div>
            </div>
            <div className="undo-row">
              <Button onClick={undo} disabled={!history.length}>
                <Undo2 /> Undo
              </Button>
              <Button onClick={redo} disabled={!future.length}>
                <Redo2 /> Redo
              </Button>
            </div>
            <button className={`mobile-tool-launch edit-tool-launch ${mobileToolsOpen ? "" : "tools-closed"}`} type="button" onClick={() => setMobileToolsOpen(true)}>
              <SlidersHorizontal />
              <span><b>Open editing tools</b><small>{tab} · {session.overlays.length} layers</small></span>
              <i>+</i>
            </button>
          </div>
          <BottomSheet className="style-panel" title="Editing tools" open={mobileToolsOpen} onClose={() => setMobileToolsOpen(false)}>
            <div className="style-tabs">
              {["Filter", "Effect", "Stickers", "Brand"].map((x) => (
                <button
                  className={tab === x ? "active" : ""}
                  onClick={() => setTab(x)}
                  key={x}
                >
                  {x}
                </button>
              ))}
            </div>
            {tab === "Filter" && (
              <>
                <h2 className="filter-panel-title">Choose filter</h2>
                <div className="filter-rail">
                  <button className="filter-rail-arrow filter-rail-arrow-left" type="button" aria-label="Scroll filters left" onClick={() => filterRailRef.current?.scrollBy({ left: -190, behavior: "smooth" })}>
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <div className="scroll-options" ref={filterRailRef}>
                    {filters.map((f) => (
                      <button
                        className={session.filterId === f.id ? "selected" : ""}
                        onClick={() => change({ filterId: f.id })}
                        key={f.id}
                      >
                        <span style={{ filter: f.css }} />
                        <small>{f.name}</small>
                      </button>
                    ))}
                  </div>
                  <button className="filter-rail-arrow filter-rail-arrow-right" type="button" aria-label="Scroll filters right" onClick={() => filterRailRef.current?.scrollBy({ left: 190, behavior: "smooth" })}>
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
                <label className="range wink-intensity">
                  <span className="wink-intensity-label">Intensity <b>{Math.round(session.filterIntensity * 100)}%</b></span>
                  <span className="wink-intensity-control">
                    <span className="wink-intensity-track" aria-hidden="true">
                      <i style={{ width: `${session.filterIntensity * 100}%` }} />
                    </span>
                    <span
                      className="wink-intensity-thumb"
                      style={{
                        left: `${session.filterIntensity * 100}%`,
                        transform: `translateX(-${session.filterIntensity * 100}%)`,
                      }}
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 64 64">
                        <rect x="7" y="8" width="50" height="48" rx="8" />
                        <rect className="wink-thumb-screen" x="15" y="16" width="34" height="27" rx="2" />
                        <ellipse className="wink-thumb-eye" cx="25" cy="28" rx="3" ry="5" />
                        <path className="wink-thumb-wink" d="M35 28l7-4m-7 4 7 4" />
                        <path className="wink-thumb-smile" d="M24 35q8 7 16 0" />
                        <path d="M27 49h10" />
                      </svg>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step=".05"
                      value={session.filterIntensity}
                      aria-label="Filter intensity"
                      onChange={(e) =>
                        change({ filterIntensity: +e.target.value })
                      }
                    />
                  </span>
                </label>
              </>
            )}
            {tab === "Effect" && (
              <div className="effect-grid">
                {effects.map((x) => (
                  <button
                    className={session.effectId === x.id ? "selected" : ""}
                    onClick={() => change({ effectId: x.id })}
                    key={x.id}
                  >
                    ✦<small>{x.name}</small>
                  </button>
                ))}
              </div>
            )}
            {tab === "Stickers" && (
              <div className="sticker-panel">
                {Object.entries(stickers).map(([cat, items]) => (
                  <div key={cat}>
                    <h3>{cat}</h3>
                    {items.map((s) => (
                      <button key={s} onClick={() => add("sticker", s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                ))}
                <Button onClick={() => add("text", "hello")} kind="primary">
                  + Add words
                </Button>
              </div>
            )}
            {tab === "Face" && (
              <div className="face-filter-panel">
                <p>Tap a look, then drag it over the face. Rotate and resize it from the selected layer controls.</p>
                <div className="face-filter-grid">
                  {faceFilters.map((filter) => (
                    <button key={filter.name} onClick={() => addFaceFilter(filter)} style={{ color: filter.color }}>
                      <span>{filter.value}</span>
                      <b>{filter.name}</b>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {tab === "Cover" && (
              <div className="cover-panel">
                <div className="cover-panel-copy">
                  <b>Magazine cover</b>
                  <small>Give this exact photo layout an editorial finish.</small>
                </div>
                <div className="cover-grid">
                  {frames
                    .filter((frame) => frame.layoutId === session.layoutId)
                    .map((frame) => (
                      <button
                        key={frame.id}
                        className={session.frameId === frame.id && session.mode === "framed" ? "selected" : ""}
                        style={{ "--cover": frame.colors[0], "--cover-accent": frame.colors[1], "--cover-ink": frame.colors[2] } as React.CSSProperties}
                        onClick={() => change({ frameId: frame.id, mode: "framed" })}
                      >
                        <span>{frame.motif}</span>
                        <b>{frame.name.replace(/ \d+$/, "")}</b>
                        <small>Wink weekly</small>
                      </button>
                    ))}
                </div>
              </div>
            )}
            {tab === "Brand" && (
              <div className="brand-panel">
                <label>
                  <input
                    type="checkbox"
                    checked={session.showBranding}
                    onChange={(e) => change({ showBranding: e.target.checked })}
                  />{" "}
                  WinkBooth wordmark
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={session.showDate}
                    onChange={(e) => change({ showDate: e.target.checked })}
                  />{" "}
                  Date
                </label>
                <label>
                  Frame color{" "}
                  <input
                    type="color"
                    value={session.theme.frame}
                    onChange={(e) =>
                      change({
                        theme: { ...session.theme, frame: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  Accent color{" "}
                  <input
                    type="color"
                    value={session.theme.accent}
                    onChange={(e) =>
                      change({
                        theme: { ...session.theme, accent: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={session.theme.gradient}
                    onChange={(e) =>
                      change({
                        theme: { ...session.theme, gradient: e.target.checked },
                      })
                    }
                  />{" "}
                  Gradient background
                </label>
                <h3>Swap frame</h3>
                <div className="mini-frames frame-swap-rail" ref={frameRailRef} onScroll={syncFrameRail}>
                  {frames
                    .filter((f) => f.layoutId === session.layoutId)
                    .map((f) => (
                      <button
                        key={f.id}
                        style={{ background: f.colors[0] }}
                        onClick={() =>
                          change({
                            frameId: f.id,
                            mode: "framed",
                            theme: {
                              ...session.theme,
                              frame: f.colors[0],
                              accent: f.colors[1],
                              label: f.colors[2],
                            },
                          })
                        }
                      >
                        {f.motif}
                      </button>
                  ))}
                </div>
                <WinkSlider label="Browse frames" value={frameRailProgress} min={0} max={100} step={1} onChange={moveFrameRail} />
              </div>
            )}
            {layer && tab !== "Effect" && (
              <div className="layer-sheet">
                <h3>
                  {layer.kind === "text" ? "Text layer" : "Sticker layer"}
                </h3>
                {layer.kind === "text" && (
                  <input
                    value={layer.value}
                    onChange={(e) => patchLayer({ value: e.target.value })}
                  />
                )}
                <WinkSlider label="Size" value={layer.scale} min={.3} max={4} step={.05} onChange={(value) => patchLayer({ scale: value })} />
                <WinkSlider label="Rotate" value={layer.rotation} min={-180} max={180} step={1} onChange={(value) => patchLayer({ rotation: value })} />
                <div className="quick-rotate-controls">
                  <Button onClick={() => patchLayer({ rotation: layer.rotation - 15 })}>
                    <RotateCcw /> Rotate left
                  </Button>
                  <Button onClick={() => patchLayer({ rotation: layer.rotation + 15 })}>
                    <RotateCw /> Rotate right
                  </Button>
                </div>
                <WinkSlider label="Opacity" value={layer.opacity} min={.1} max={1} step={.05} onChange={(value) => patchLayer({ opacity: value })} />
                <label>
                  Color{" "}
                  <input
                    type="color"
                    value={layer.color}
                    onChange={(e) => patchLayer({ color: e.target.value })}
                  />
                </label>
                <div>
                  <Button onClick={() => add(layer.kind, layer.value)}>
                    <Copy /> Duplicate
                  </Button>
                  <Button
                    onClick={() =>
                      patchLayer({ x: 0.5, y: 0.5, scale: 1, rotation: 0, opacity: 1 })
                    }
                  >
                    <RotateCcw /> Reset
                  </Button>
                  <Button
                    onClick={() => {
                      change({
                        overlays: session.overlays.filter(
                          (x) => x.id !== layer.id,
                        ),
                      });
                      setSelected(undefined);
                    }}
                  >
                    <Trash2 /> Delete
                  </Button>
                </div>
              </div>
            )}
          </BottomSheet>
        </div>
      </section>
    </Shell>
  );
}

function WinkSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <label className="range wink-intensity layer-wink-slider">
      <span className="wink-intensity-label">{label} <b>{label === "Rotate" ? `${Math.round(value)}°` : `${Math.round(percent)}%`}</b></span>
      <span className="wink-intensity-control">
        <span className="wink-intensity-track" aria-hidden="true"><i style={{ width: `${percent}%` }} /></span>
        <span className="wink-intensity-thumb" style={{ left: `${percent}%`, transform: `translateX(-${percent}%)` }} aria-hidden="true">
          <svg viewBox="0 0 64 64">
            <rect x="7" y="8" width="50" height="48" rx="8" />
            <rect className="wink-thumb-screen" x="15" y="16" width="34" height="27" rx="2" />
            <ellipse className="wink-thumb-eye" cx="25" cy="28" rx="3" ry="5" />
            <path className="wink-thumb-wink" d="M35 28l7-4m-7 4 7 4" />
            <path className="wink-thumb-smile" d="M24 35q8 7 16 0" />
            <path d="M27 49h10" />
          </svg>
        </span>
        <input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={(event) => onChange(+event.target.value)} />
      </span>
    </label>
  );
}
