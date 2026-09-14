import { Copy, Redo2, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { effects, filters, frames, layouts } from "../catalog";
import { Button, Shell, SectionTitle } from "../components";
import { compose } from "../render";
import { useBooth } from "../store";
import type { CaptureSession, OverlayLayer } from "../types";
const stickers = {
  Classic: ["✦", "☻", "✿", "☁", "☀", "♬"],
  Coquette: ["୨୧", "🎀", "♡", "🦢", "🕯️", "🫧"],
  Hearts: ["♥", "♡", "💕", "💛", "💗", "💌"],
  Food: ["🍒", "🍓", "🍰", "🍋", "🧀", "🍬"],
};
export default function Edit() {
  const { session, setSession } = useBooth(),
    nav = useNavigate(),
    [preview, setPreview] = useState(""),
    [tab, setTab] = useState("Filter"),
    [selected, setSelected] = useState<string>(),
    [history, setHistory] = useState<CaptureSession[]>([]),
    [future, setFuture] = useState<CaptureSession[]>([]);
  const layout = layouts.find((item) => item.id === session.layoutId) ?? layouts[0];
  const previewWidth = Math.min(540, 700 * (layout.width / layout.height));
  const previewRef = useRef<HTMLDivElement>(null);
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
          <SectionTitle
            title="Style your strip"
            copy="Filters, frames, stickers, words."
          />
          <Button onClick={() => nav("/export")} kind="primary">
            Export →
          </Button>
        </div>
        <div className="edit-grid">
          <div>
            <div className="preview-wrap" ref={previewRef} style={{ width: `min(100%, ${previewWidth}px)` }}>
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
          </div>
          <aside className="style-panel">
            <div className="style-tabs">
              {["Filter", "Effect", "Stickers", "Cover", "Brand"].map((x) => (
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
                <div className="scroll-options">
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
                <label className="range">
                  Intensity{" "}
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step=".05"
                    value={session.filterIntensity}
                    onChange={(e) =>
                      change({ filterIntensity: +e.target.value })
                    }
                  />
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
                <div className="mini-frames">
                  {frames
                    .filter((f) => f.layoutId === session.layoutId)
                    .map((f) => (
                      <button
                        key={f.id}
                        style={{ background: f.colors[0] }}
                        onClick={() =>
                          change({ frameId: f.id, mode: "framed" })
                        }
                      >
                        {f.motif}
                      </button>
                    ))}
                </div>
              </div>
            )}
            {layer && (
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
                <label>
                  Size{" "}
                  <input
                    type="range"
                    min=".3"
                    max="4"
                    step=".05"
                    value={layer.scale}
                    onChange={(e) => patchLayer({ scale: +e.target.value })}
                  />
                </label>
                <label>
                  Rotate{" "}
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={layer.rotation}
                    onChange={(e) => patchLayer({ rotation: +e.target.value })}
                  />
                </label>
                <label>
                  Opacity{" "}
                  <input
                    type="range"
                    min=".1"
                    max="1"
                    step=".05"
                    value={layer.opacity}
                    onChange={(e) => patchLayer({ opacity: +e.target.value })}
                  />
                </label>
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
          </aside>
        </div>
      </section>
    </Shell>
  );
}
