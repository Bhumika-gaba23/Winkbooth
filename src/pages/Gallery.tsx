import {
  Archive,
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
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { db, decryptBlob, encryptBlob, makeVault, unlockVault } from "../db";
import { Button, Shell, SectionTitle } from "../components";
import { downloadBlob } from "../render";
import type { Album, GalleryPhoto, VaultConfig } from "../types";
function PhotoThumb({
  p,
  keyObj,
  onClick,
  onDelete,
  selected,
}: {
  p: GalleryPhoto;
  keyObj: CryptoKey | null;
  onClick: () => void;
  onDelete: () => void;
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
    <button
      className="gallery-tile"
      onClick={onClick}
      aria-label={selected ? "Deselect photo" : "Select photo"}
    >
      {url ? <img src={url} /> : <Lock />}
      {selected && <span>✓</span>}
    </button>
    <button className="gallery-delete" type="button" onClick={onDelete} aria-label="Delete photo"><Trash2 /></button>
    </div>
  );
}
export default function Gallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]),
    [albums, setAlbums] = useState<Album[]>([]),
    [tab, setTab] = useState<"photos" | "albums">("photos"),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [albumId, setAlbumId] = useState<string>(),
    [vault, setVault] = useState<VaultConfig>(),
    [vaultOpen, setVaultOpen] = useState(false),
    [vaultKey, setVaultKey] = useState<CryptoKey | null>(null),
    [lockOpen, setLockOpen] = useState(false),
    [wall, setWall] = useState(() => localStorage.getItem("winkbooth.wall") ?? "cork"),
    [usage, setUsage] = useState("");
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
      .then((x) =>
        setUsage(
          `${Math.round((x.usage ?? 0) / 1048576)} MB of ${Math.round((x.quota ?? 0) / 1048576)} MB used`,
        ),
      );
  }, []);
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
                : "Pinch to resize · swipe between photos and albums."
            }
          />
          <div>
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
        <div className="storage">
          <span>{usage || "Checking device storage…"}</span>
          <i>
            <b style={{ width: "12%" }} />
          </i>
        </div>
        <div className="gallery-tabs">
          <button
            className={tab === "photos" ? "active" : ""}
            onClick={() => setTab("photos")}
          >
            Photos
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
                  {[["cork", "Cork"], ["blush", "Blush"], ["linen", "Linen"], ["night", "Night"]].map(([id, label]) => (
                    <button key={id} className={wall === id ? "active" : ""} onClick={() => { setWall(id); localStorage.setItem("winkbooth.wall", id); }}>
                      <i className={`wall-swatch ${id}`} />{label}
                    </button>
                  ))}
                </div>
              <div className={`gallery-groups wall-${wall}`}>
                <div className="memory-wall-masthead">
                  <span>✦ ✦ ✦</span>
                  <b>WinkBooth</b>
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
                          onClick={() => toggle(p.id)}
                          onDelete={() => void removeOne(p.id)}
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
