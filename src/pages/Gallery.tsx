import {
  Archive,
  BookOpen,
  CheckSquare,
  Download,
  EyeOff,
  FolderPlus,
  Image as ImageIcon,
  KeyRound,
  Lock,
  Move,
  Pin,
  Printer,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db, decryptBlob, encryptBlob, makeVault, unlockVault } from "../db";
import { Button, Shell, SectionTitle } from "../components";
import { downloadBlob } from "../render";
import type { Album, GalleryPhoto, VaultConfig } from "../types";
const wallMoods = [
  ["cork", "Cork"], ["blush", "Blush"], ["linen", "Linen"], ["night", "Night"],
  ["cotton-candy", "Cotton candy"], ["lemon", "Lemon fizz"], ["sky", "Blue sky"],
  ["confetti", "Confetti"], ["lavender", "Lavender"], ["cherry", "Cherry"],
] as const;
function PhotoThumb({
  p,
  keyObj,
  onSelect,
  onDelete,
  onDownload,
  onShare,
  selected,
}: {
  p: GalleryPhoto;
  keyObj: CryptoKey | null;
  onSelect: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onShare: () => void;
  selected: boolean;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let u = "";
    (async () => {
      let b = p.thumbnail;
      if (p.hidden && p.thumbCipher && p.thumbIv && keyObj)
        b = await decryptBlob(p.thumbCipher, p.thumbIv, keyObj);
      if (b) {
        u = URL.createObjectURL(b);
        setUrl(u);
      }
    })();
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [p, keyObj]);
  return (
    <div className={`gallery-tile-wrap ${selected ? "selected" : ""}`}>
    <div className="gallery-tile" aria-label="Gallery photo">
      {url ? <img src={url} /> : <Lock />}
      {selected && <span>✓</span>}
    </div>
    <button className="gallery-select" type="button" onClick={(event) => { event.stopPropagation(); onSelect(); }} aria-label={selected ? "Deselect photo" : "Select photo"}>
      {selected ? "✓" : "＋"}
    </button>
    <button className="gallery-delete" type="button" onClick={onDelete} aria-label="Delete photo"><Trash2 /></button>
    <button
      className="gallery-download"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onDownload();
      }}
      aria-label="Download photo"
    >
      <Download />
    </button>
    <button
      className="gallery-share"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onShare();
      }}
      aria-label="Share photo to Stories"
    >
      <Share2 />
    </button>
    </div>
  );
}
export default function Gallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]),
    [albums, setAlbums] = useState<Album[]>([]),
    [tab, setTab] = useState<"photos" | "spiral" | "albums">("photos"),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [albumId, setAlbumId] = useState<string>(),
    [vault, setVault] = useState<VaultConfig>(),
    [vaultOpen, setVaultOpen] = useState(false),
    [vaultKey, setVaultKey] = useState<CryptoKey | null>(null),
    [lockOpen, setLockOpen] = useState(false),
    [wall, setWall] = useState(() => localStorage.getItem("winkbooth.wall") ?? "cork"),
    [usage, setUsage] = useState(""),
    [usagePercent, setUsagePercent] = useState(0),
    [storageOpen, setStorageOpen] = useState(false),
    storageRef = useRef<HTMLDivElement>(null);
  const load = async () => {
    setPhotos(await db.photos.orderBy("createdAt").reverse().toArray());
    setAlbums(await db.albums.toArray());
    setVault(await db.vault.get("vault"));
  };
  useEffect(() => {
    load();
    navigator.storage?.persist?.();
    navigator.storage
      ?.estimate?.()
      .then((x) => {
        const used = x.usage ?? 0;
        const quota = x.quota ?? 0;
        setUsage(`${Math.round(used / 1048576)} MB of ${Math.round(quota / 1048576)} MB used`);
        setUsagePercent(quota ? Math.min(100, Math.max(0, (used / quota) * 100)) : 0);
      });
  }, []);
  useEffect(() => {
    if (!storageOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!storageRef.current?.contains(event.target as Node)) setStorageOpen(false);
    };
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, [storageOpen]);
  const visible = useMemo(
    () =>
      photos.filter(
        (p) =>
          p.hidden === vaultOpen &&
          (!albumId || p.albumId === albumId) &&
          ageMatch(p.createdAt, filter),
      ),
    [photos, vaultOpen, albumId, filter],
  );
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const picked = photos.filter((p) => selected.has(p.id));
  async function createAlbum() {
    const name = prompt("Album name");
    if (name?.trim()) {
      await db.albums.add({
        id: crypto.randomUUID(),
        name: name.trim(),
        createdAt: Date.now(),
        pinned: false,
      });
      load();
    }
  }
  async function remove() {
    if (
      !selected.size ||
      !confirm(
        `Delete ${selected.size} photo${selected.size === 1 ? "" : "s"}?`,
      )
    )
      return;
    await db.photos.bulkDelete([...selected]);
    setSelected(new Set());
    load();
  }
  async function removeOne(id: string) {
    if (!confirm("Delete this photo? This cannot be undone.")) return;
    await db.photos.delete(id);
    setSelected((items) => {
      const next = new Set(items);
      next.delete(id);
      return next;
    });
    load();
  }
  async function hide() {
    if (!selected.size) return;
    if (!vaultKey) {
      setLockOpen(true);
      return;
    }
    for (const p of picked) {
      if (p.hidden || !p.image) continue;
      const a = await encryptBlob(p.image, vaultKey),
        b = await encryptBlob(p.thumbnail ?? p.image, vaultKey);
      await db.photos.update(p.id, {
        hidden: true,
        image: undefined,
        thumbnail: undefined,
        cipher: a.cipher,
        iv: a.iv,
        thumbCipher: b.cipher,
        thumbIv: b.iv,
      });
    }
    setSelected(new Set());
    load();
  }
  async function unhide() {
    if (!vaultKey) return;
    for (const p of picked) {
      if (!p.hidden || !p.cipher || !p.iv) continue;
      const image = await decryptBlob(p.cipher, p.iv, vaultKey),
        thumbnail =
          p.thumbCipher && p.thumbIv
            ? await decryptBlob(p.thumbCipher, p.thumbIv, vaultKey)
            : image;
      await db.photos.update(p.id, {
        hidden: false,
        image,
        thumbnail,
        cipher: undefined,
        iv: undefined,
        thumbCipher: undefined,
        thumbIv: undefined,
      });
    }
    setSelected(new Set());
    load();
  }
  async function move() {
    const target = prompt(
      `Move to album name (${albums.map((a) => a.name).join(", ")})`,
    );
    const a = albums.find(
      (x) => x.name.toLowerCase() === target?.toLowerCase(),
    );
    if (target && !a) return alert("Album not found.");
    for (const p of picked) await db.photos.update(p.id, { albumId: a?.id });
    setSelected(new Set());
    load();
  }
  async function download() {
    for (const p of picked) {
      let b = p.image;
      if (p.hidden && p.cipher && p.iv && vaultKey)
        b = await decryptBlob(p.cipher, p.iv, vaultKey);
      if (b) downloadBlob(b, `winkbooth-${p.id}.png`);
    }
  }
  async function downloadOne(p: GalleryPhoto) {
    let b = p.image;
    if (p.hidden && p.cipher && p.iv && vaultKey)
      b = await decryptBlob(p.cipher, p.iv, vaultKey);
    if (!b) return;
    const suggested = `winkbooth-${p.id}`;
    const entered = prompt("Name this downloaded photo", suggested);
    if (entered === null) return;
    const safeName = entered.trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\.png$/i, "").trim();
    downloadBlob(b, `${safeName || suggested}.png`);
  }
  async function shareOne(p: GalleryPhoto) {
    let b = p.image;
    if (p.hidden && p.cipher && p.iv && vaultKey)
      b = await decryptBlob(p.cipher, p.iv, vaultKey);
    if (!b) return;
    const file = new File([b], `winkbooth-${p.id}.png`, { type: b.type || "image/png" });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      try {
        await navigator.share({
          files: [file],
          title: "WinkBooth photo",
          text: "Share this WinkBooth photo to your Story",
        });
      } catch (error) {
        if ((error as DOMException).name !== "AbortError")
          alert("Sharing was not completed. Try again or download the photo instead.");
      }
      return;
    }
    alert("Story sharing is available on supported mobile browsers. Download the photo and add it to Instagram or Snapchat manually.");
  }
  async function enterVault() {
    setLockOpen(true);
  }
  return (
    <Shell>
      <section className="page gallery-page">
        <div className="title-row">
          <SectionTitle
            title={vaultOpen ? "The locked drawer" : "Your memory wall"}
            copy={
              selected.size
                ? `${selected.size} selected`
                : "Pinch to resize · swipe through your wall or strips."
            }
          />
          <div className="gallery-header-actions">
            <Link className="button ghost gallery-style-link" to="/edit">
              Style your strip →
            </Link>
            {vaultOpen && (
              <Button
                onClick={() => {
                  setVaultOpen(false);
                  setVaultKey(null);
                }}
              >
                <X /> Exit vault
              </Button>
            )}
            <Button onClick={enterVault}>
              <Lock /> Vault
            </Button>
          </div>
        </div>
        <div className="storage-control" ref={storageRef}>
          <span>{usage || "Checking device storage…"}</span>
          <button className="storage-toggle" type="button" aria-expanded={storageOpen} aria-label={usage ? `Device storage: ${usage}` : "Checking device storage"} onClick={() => setStorageOpen((open) => !open)} style={{ "--storage-used": `${usagePercent}%` } as React.CSSProperties}>
            <span className="storage-toggle-core">⌁</span>
          </button>
          {storageOpen && <div className="storage-popover">{usage || "Checking device storage"}</div>}
        </div>
        <div className="gallery-tabs">
          <button
            className={tab === "photos" ? "active" : ""}
            onClick={() => setTab("photos")}
          >
            Photos
          </button>
          <button
            className={tab === "spiral" ? "active" : ""}
            onClick={() => setTab("spiral")}
          >
            <BookOpen /> Strips
          </button>
          <button
            className={tab === "albums" ? "active" : ""}
            onClick={() => setTab("albums")}
          >
            Albums
          </button>
        </div>
        {tab === "photos" ? (
          <>
            {photos.length > 0 && (
              <div className="filters">
                {["all", "day", "week", "month", "year"].map((x) => (
                  <button
                    className={filter === x ? "active" : ""}
                    onClick={() => setFilter(x)}
                    key={x}
                  >
                    {x === "day" ? "Today" : x[0].toUpperCase() + x.slice(1)}
                  </button>
                ))}
              </div>
            )}
            {selected.size > 0 && (
              <div className="selection-bar">
                <Button
                  onClick={() => setSelected(new Set(visible.map((x) => x.id)))}
                >
                  <CheckSquare /> All
                </Button>
                <Button onClick={download}>
                  <Download /> Download
                </Button>
                <Button onClick={move}>
                  <Move /> Move
                </Button>
                <Button onClick={vaultOpen ? unhide : hide}>
                  <EyeOff /> {vaultOpen ? "Unhide" : "Hide"}
                </Button>
                <Button onClick={remove}>
                  <Trash2 /> Delete
                </Button>
                <Button onClick={() => setSelected(new Set())}>
                  <X /> Cancel
                </Button>
              </div>
            )}
            {visible.length ? (
              <>
                <div className="wall-picker" aria-label="Memory wall background">
                  <span>Wall mood</span>
                  {wallMoods.map(([id, label]) => (
                    <button key={id} className={wall === id ? "active" : ""} onClick={() => { setWall(id); localStorage.setItem("winkbooth.wall", id); }}>
                      <i className={`wall-swatch ${id}`} />{label}
                    </button>
                  ))}
                </div>
              <div className={`gallery-groups wall-${wall}`}>
                <div className="memory-wall-masthead">
                  <span>✦ ✦ ✦</span>
                  <div className="memory-wall-logo">
                    <img src="/winkbooth-mark.svg" alt="" aria-hidden="true" />
                    <b>WinkBooth</b>
                  </div>
                  <small>memory spotlight · saved on this device</small>
                </div>
                {groupPhotos(visible).map((g) => (
                  <section key={g.name}>
                    <h2>{g.name}</h2>
                    <div className="gallery-grid">
                      {g.items.map((p) => (
                        <PhotoThumb
                          p={p}
                          key={p.id}
                          keyObj={vaultKey}
                          selected={selected.has(p.id)}
                          onSelect={() => toggle(p.id)}
                          onDelete={() => void removeOne(p.id)}
                          onDownload={() => void downloadOne(p)}
                          onShare={() => void shareOne(p)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              </>
            ) : (
              <div className="empty-gallery">
                <ImageIcon />
                <h2>
                  {vaultOpen ? "Your vault is empty" : "No photos here yet"}
                </h2>
                <p>
                  {vaultOpen
                    ? "Hide a gallery photo to encrypt and store it here."
                    : "Capture a strip and save it to start your collection."}
                </p>
                {!vaultOpen && (
                  <Link className="button primary" to="/booth">
                    Start your first roll
                  </Link>
                )}
              </div>
            )}
          </>
        ) : tab === "spiral" ? (
          <>
            {photos.length > 0 && (
              <div className="filters">
                {["all", "day", "week", "month", "year"].map((x) => (
                  <button
                    className={filter === x ? "active" : ""}
                    onClick={() => setFilter(x)}
                    key={x}
                  >
                    {x === "day" ? "Today" : x[0].toUpperCase() + x.slice(1)}
                  </button>
                ))}
              </div>
            )}
            {visible.length ? (
              <SpiralAlbum
                photos={visible}
                keyObj={vaultKey}
              />
            ) : (
              <div className="empty-gallery">
                <BookOpen />
                <h2>Your strips are waiting</h2>
                <p>Capture a photo and it will be tucked into these pages.</p>
                <Link className="button primary" to="/booth">Start your first roll</Link>
              </div>
            )}
          </>
        ) : (
          <div className="albums">
            <Button kind="primary" onClick={createAlbum}>
              <FolderPlus /> New album
            </Button>
            {albums.length ? (
              <div className="album-grid">
                {albums
                  .sort((a, b) => Number(b.pinned) - Number(a.pinned))
                  .map((a) => (
                    <article
                      key={a.id}
                      onClick={() => {
                        setAlbumId(a.id);
                        setTab("photos");
                      }}
                    >
                      <div>
                        <Archive />
                        {a.pinned && <Pin />}
                      </div>
                      <h3>{a.name}</h3>
                      <p>
                        {
                          photos.filter((p) => p.albumId === a.id && !p.hidden)
                            .length
                        }{" "}
                        photos
                      </p>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await db.albums.update(a.id, { pinned: !a.pinned });
                          load();
                        }}
                      >
                        {a.pinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              "Delete album? Photos return to the main gallery.",
                            )
                          ) {
                            await db.photos
                              .where("albumId")
                              .equals(a.id)
                              .modify({ albumId: undefined });
                            await db.albums.delete(a.id);
                            load();
                          }
                        }}
                      >
                        Delete
                      </button>
                    </article>
                  ))}
              </div>
            ) : (
              <p>No folders yet. Start one for a trip, party, or tiny ordinary day worth keeping.</p>
            )}
          </div>
        )}
        {lockOpen && (
          <VaultDialog
            exists={!!vault}
            onClose={() => setLockOpen(false)}
            onUnlock={async (kind, secret) => {
              let key;
              if (vault) key = await unlockVault(secret);
              else key = await makeVault(kind, secret);
              if (!key) return false;
              setVaultKey(key);
              setVaultOpen(true);
              setLockOpen(false);
              await load();
              return true;
            }}
          />
        )}
      </section>
    </Shell>
  );
}
function SpiralAlbum({ photos, keyObj }: {
  photos: GalleryPhoto[];
  keyObj: CryptoKey | null;
}) {
  const nav = useNavigate();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMotion, setPreviewMotion] = useState("");
  const [leavingPreview, setLeavingPreview] = useState<{ id: string; url: string }>();
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const previewSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const previewDidSwipe = useRef(false);
  const transitionTimer = useRef<number | undefined>(undefined);
  const previewMotionTimer = useRef<number | undefined>(undefined);
  const pendingScrollY = useRef<number | null>(null);
  const scrollRestoreFrame = useRef<number | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const made: string[] = [];
    (async () => {
      const next: Record<string, string> = {};
      for (const photo of photos) {
        let blob = photo.image ?? photo.thumbnail;
        if (photo.hidden && photo.cipher && photo.iv && keyObj)
          blob = await decryptBlob(photo.cipher, photo.iv, keyObj);
        if (blob) {
          const url = URL.createObjectURL(blob);
          made.push(url);
          next[photo.id] = url;
        }
      }
      if (active) setUrls(next);
    })();
    return () => {
      active = false;
      made.forEach(URL.revokeObjectURL);
    };
  }, [photos, keyObj]);

  useEffect(() => setActiveIndex((current) => Math.min(current, Math.max(0, photos.length - 1))), [photos.length]);
  useEffect(() => {
    if (!previewOpen) return;
    const handlePreviewKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
      if (event.key === "ArrowLeft") changePreview(-1);
      if (event.key === "ArrowRight") changePreview(1);
    };
    window.addEventListener("keydown", handlePreviewKeys);
    return () => window.removeEventListener("keydown", handlePreviewKeys);
  }, [photos.length, previewOpen]);
  useEffect(() => () => {
    window.clearTimeout(transitionTimer.current);
    window.clearTimeout(previewMotionTimer.current);
    if (scrollRestoreFrame.current !== undefined)
      window.cancelAnimationFrame(scrollRestoreFrame.current);
  }, []);
  useLayoutEffect(() => {
    const scrollY = pendingScrollY.current;
    if (scrollY === null) return;
    window.scrollTo(0, scrollY);
    scrollRestoreFrame.current = window.requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
      pendingScrollY.current = null;
    });
  }, [activeIndex]);

  const showNext = () => {
    if (transitioning || activeIndex >= photos.length - 1) return;
    pendingScrollY.current = window.scrollY;
    setTransitioning(true);
    setActiveIndex((current) => current + 1);
    window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => setTransitioning(false), 1080);
  };
  const showPrevious = () => {
    if (transitioning || activeIndex === 0) return;
    pendingScrollY.current = window.scrollY;
    setActiveIndex((current) => Math.max(0, current - 1));
  };
  const changePreview = (direction: 1 | -1) => {
    if (previewMotion) return;
    const next = Math.min(photos.length - 1, Math.max(0, activeIndex + direction));
    if (next === activeIndex) return;
    const current = photos[activeIndex];
    const currentUrl = current ? urls[current.id] : "";
    if (current && currentUrl) setLeavingPreview({ id: current.id, url: currentUrl });
    setPreviewMotion(direction === 1 ? "is-deck-next" : "is-deck-previous");
    window.clearTimeout(previewMotionTimer.current);
    previewMotionTimer.current = window.setTimeout(() => {
      setPreviewMotion("");
      setLeavingPreview(undefined);
    }, 1020);
    setActiveIndex(next);
  };

  return (
    <section className="spiral-album" aria-label="Photo strips">
      <header className="spiral-album-heading">
        <div>
          <span className="spiral-kicker">A little book of big moments</span>
          <h2>Your strips</h2>
        </div>
        <span className="spiral-scroll-note">Swipe up to reveal the next strip</span>
      </header>
      <div
        className="spiral-stack spiral-deck"
        onPointerDown={(event) => { swipeStart.current = { x: event.clientX, y: event.clientY }; }}
        onPointerUp={(event) => {
          const start = swipeStart.current;
          swipeStart.current = null;
          if (!start) return;
          const x = event.clientX - start.x;
          const y = event.clientY - start.y;
          if (Math.max(Math.abs(x), Math.abs(y)) < 45) return;
          if (y < 0 || x < 0) showNext();
          else showPrevious();
        }}
      >
        <div className="spiral-fullview-cue" aria-hidden="true">
          <b>Want the full story?</b>
          <span>Tap a strip for its full view</span>
        </div>
        {photos.slice(0, activeIndex + 1).map((photo, index) => (
          <article
            className={`spiral-strip ${index === activeIndex ? "is-incoming" : index === activeIndex - 1 ? "is-previous" : "is-settled"}`}
            key={photo.id}
            role="button"
            tabIndex={0}
            aria-label={`Open strip ${index + 1} in full view`}
            onClick={() => index === activeIndex && setPreviewOpen(true)}
            onKeyDown={(event) => {
              if (index === activeIndex && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                setPreviewOpen(true);
              }
            }}
            style={{
              "--strip-z": index + 2,
              "--strip-rotate": `${index % 3 === 0 ? -1.4 : index % 3 === 1 ? 1.3 : -.45}deg`,
            } as React.CSSProperties}
          >
            <span className="spiral-strip-number">{String(index + 1).padStart(2, "0")}</span>
            <div className="spiral-strip-photo">
              {urls[photo.id] ? <img src={urls[photo.id]} alt={`Memory ${index + 1}`} /> : <Lock />}
            </div>
            <div className="spiral-strip-caption">
              <b>{new Date(photo.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</b>
              <span>{index % 3 === 0 ? "keep this one forever" : index % 3 === 1 ? "a moment worth holding" : "from the camera roll, with love"}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="spiral-deck-controls">
        <button type="button" onClick={showPrevious} disabled={activeIndex === 0 || transitioning}>← Previous</button>
        <span aria-live="polite">{activeIndex + 1} / {photos.length}</span>
        <button
          type="button"
          onClick={activeIndex < photos.length - 1 ? showNext : () => nav("/booth")}
          disabled={transitioning}
        >
          {activeIndex < photos.length - 1 ? "Next strip ↑" : "Take another"}
        </button>
      </div>
      <p className="spiral-hint">The next strip rises from beneath the active photo and settles on top.</p>
      {previewOpen && urls[photos[activeIndex]?.id] && (
        <div
          className="strip-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen photo strip preview"
          onClick={() => {
            if (previewDidSwipe.current) {
              previewDidSwipe.current = false;
              return;
            }
            setPreviewOpen(false);
          }}
          onPointerDown={(event) => {
            previewDidSwipe.current = false;
            previewSwipeStart.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            const start = previewSwipeStart.current;
            previewSwipeStart.current = null;
            if (!start) return;
            const distanceY = event.clientY - start.y;
            if (Math.abs(distanceY) < 45 || Math.abs(distanceY) < Math.abs(event.clientX - start.x)) return;
            previewDidSwipe.current = true;
            if (distanceY < 0) changePreview(1);
            else changePreview(-1);
          }}
          onPointerCancel={() => { previewSwipeStart.current = null; }}
        >
          <div className="strip-lightbox-brand" aria-label="WinkBooth">
            <img src="/winkbooth-mark.svg" alt="" />
            <span>WinkBooth</span>
          </div>
          <button
            className="strip-lightbox-close"
            type="button"
            aria-label="Close full-screen preview"
            onClick={() => setPreviewOpen(false)}
          >
            <X />
          </button>
          {leavingPreview && (
            <img
              key={`leaving-${leavingPreview.id}`}
              className="strip-lightbox-previous"
              src={leavingPreview.url}
              alt=""
              aria-hidden="true"
            />
          )}
          <img
            key={photos[activeIndex].id}
            className={`strip-lightbox-preview ${previewMotion}`}
            src={urls[photos[activeIndex].id]}
            alt={`Full-size photo strip ${activeIndex + 1}`}
            onClick={(event) => event.stopPropagation()}
          />
          <nav className="strip-lightbox-navigation" aria-label="Photo strip navigation" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              disabled={activeIndex === 0 || Boolean(previewMotion)}
              onClick={() => changePreview(-1)}
            >
              ← Previous strip
            </button>
            <span aria-live="polite">{activeIndex + 1} / {photos.length}</span>
            <button
              type="button"
              disabled={activeIndex === photos.length - 1 || Boolean(previewMotion)}
              onClick={() => changePreview(1)}
            >
              Next strip →
            </button>
          </nav>
          <p>Tap outside the strip or press Esc to close</p>
        </div>
      )}
    </section>
  );
}
function ExpandedPhotoStrip({ photos, current, imageUrl, keyObj, onClose, onSelect, onDownload, onShare }: {
  photos: GalleryPhoto[]; current: GalleryPhoto; imageUrl: string; keyObj: CryptoKey | null;
  onClose: () => void; onSelect: (photo: GalleryPhoto) => void; onDownload: () => void; onShare: () => void;
}) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const wheelLock = useRef(false);
  const index = Math.max(0, photos.findIndex((p) => p.id === current.id));
  const adjacent = photos.slice(Math.max(0, index - 3), Math.min(photos.length, index + 4));
  const before = adjacent.filter((photo) => photos.findIndex((item) => item.id === photo.id) < index);
  const after = adjacent.filter((photo) => photos.findIndex((item) => item.id === photo.id) > index);
  useEffect(() => {
    let active = true;
    const urls: string[] = [];
    (async () => {
      const next: Record<string, string> = {};
      for (const photo of adjacent) {
        let blob = photo.thumbnail ?? photo.image;
        if (photo.hidden && photo.thumbCipher && photo.thumbIv && keyObj)
          blob = await decryptBlob(photo.thumbCipher, photo.thumbIv, keyObj);
        if (blob) { const url = URL.createObjectURL(blob); urls.push(url); next[photo.id] = url; }
      }
      if (active) setThumbs(next);
    })();
    return () => { active = false; urls.forEach(URL.revokeObjectURL); };
  }, [current.id, photos, keyObj]);
  const glideThumbRail = (event: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault();
      event.currentTarget.scrollBy({ left: event.deltaY, behavior: "smooth" });
    }
  };
  const changeFromTrackpad = (event: React.WheelEvent<HTMLElement>) => {
    if (Math.abs(event.deltaX) < 18 || Math.abs(event.deltaX) <= Math.abs(event.deltaY) || wheelLock.current) return;
    event.preventDefault();
    const nextIndex = event.deltaX > 0 ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= photos.length) return;
    wheelLock.current = true;
    onSelect(photos[nextIndex]);
    window.setTimeout(() => { wheelLock.current = false; }, 420);
  };
  return <section className="expanded-photo-strip" aria-label="Expanded photo strip" onWheel={changeFromTrackpad}>
    <div className="expanded-strip-heading"><span>Expanded memory strip</span><button type="button" onClick={onClose} aria-label="Close strip"><X /> Close strip</button></div>
    <div className="expanded-strip-row">
      <button className="expanded-strip-arrow" type="button" disabled={index === 0} onClick={() => onSelect(photos[index - 1])} aria-label="Previous photo">‹</button>
      <div className="expanded-strip-thumbs expanded-strip-thumbs-before" onWheel={glideThumbRail}>{before.map((photo) => <button key={photo.id} type="button" onClick={() => onSelect(photo)}><img src={thumbs[photo.id] ?? ""} alt="" /></button>)}</div>
      <div className="expanded-strip-main">{imageUrl ? <img key={`${current.id}-${imageUrl}`} className="expanded-strip-main-photo" src={imageUrl} alt="Expanded gallery photo" style={{ width: "auto", height: "min(70dvh, 720px)", maxWidth: "100%", objectFit: "contain" }} /> : <Lock />}</div>
      <div className="expanded-strip-thumbs expanded-strip-thumbs-after" onWheel={glideThumbRail}>{after.map((photo) => <button key={photo.id} type="button" onClick={() => onSelect(photo)}><img src={thumbs[photo.id] ?? ""} alt="" /></button>)}</div>
      <button className="expanded-strip-arrow" type="button" disabled={index === photos.length - 1} onClick={() => onSelect(photos[index + 1])} aria-label="Next photo">›</button>
    </div>
    <div className="expanded-strip-actions"><Button onClick={onDownload}><Download /> Download</Button><Button onClick={onShare}><Share2 /> Share</Button></div>
  </section>;
}
function ageMatch(time: number, f: string) {
  const d = Date.now() - time,
    day = 86400000;
  return (
    f === "all" ||
    (f === "day" && d < day) ||
    (f === "week" && d < 7 * day) ||
    (f === "month" && d < 31 * day) ||
    (f === "year" && d < 365 * day)
  );
}
function groupPhotos(items: GalleryPhoto[]) {
  const map = new Map<string, GalleryPhoto[]>();
  for (const p of items) {
    const d = new Date(p.createdAt),
      now = new Date();
    const name =
      d.toDateString() === now.toDateString()
        ? "Today"
        : d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    map.set(name, [...(map.get(name) ?? []), p]);
  }
  return [...map].map(([name, items]) => ({ name, items }));
}
function VaultDialog({
  exists,
  onClose,
  onUnlock,
}: {
  exists: boolean;
  onClose: () => void;
  onUnlock: (
    kind: "pin" | "password" | "pattern",
    secret: string,
  ) => Promise<boolean>;
}) {
  const [kind, setKind] = useState<"pin" | "password" | "pattern">("pin"),
    [secret, setSecret] = useState(""),
    [confirmCode, setConfirm] = useState(""),
    [error, setError] = useState("");
  async function go() {
    if (secret.length < 4) return setError("Use at least 4 characters.");
    if (!exists && secret !== confirmCode)
      return setError("Those codes do not match.");
    if (!(await onUnlock(kind, secret))) setError("Wrong code — try again.");
  }
  return (
    <div className="vault-dialog">
      <div>
        <KeyRound />
        <h2>{exists ? "Unlock your vault" : "Create your vault lock"}</h2>
        <p>
          {exists
            ? "Enter the code you chose on this device."
            : "Hidden photos will be encrypted. There is no recovery if you forget this code."}
        </p>
        {!exists && (
          <div className="kind-tabs">
            {(["pin", "pattern", "password"] as const).map((x) => (
              <button
                className={kind === x ? "active" : ""}
                onClick={() => setKind(x)}
              >
                {x}
              </button>
            ))}
          </div>
        )}
        <input
          autoFocus
          type={kind === "password" ? "password" : "text"}
          inputMode={kind === "pin" ? "numeric" : "text"}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder={
            kind === "pattern" ? "Pattern, e.g. 1-2-5-8" : "Enter code"
          }
        />
        {!exists && (
          <input
            type="password"
            value={confirmCode}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm code"
          />
        )}
        {error && <b className="error">{error}</b>}
        <Button kind="primary" onClick={go}>
          {exists ? "Unlock" : "Encrypt my vault"}
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}
