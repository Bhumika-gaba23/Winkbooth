import Dexie, { type EntityTable } from "dexie";
import type { Album, GalleryPhoto, VaultConfig } from "./types";
export const db = new Dexie("WinkBooth") as Dexie & {
  photos: EntityTable<GalleryPhoto, "id">;
  albums: EntityTable<Album, "id">;
  vault: EntityTable<VaultConfig, "id">;
};
db.version(1).stores({
  photos: "id,createdAt,albumId,hidden",
  albums: "id,createdAt,pinned",
  vault: "id",
});
const enc = new TextEncoder();
export async function deriveKey(
  secret: string,
  salt: Uint8Array,
  iterations = 310000,
) {
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function makeVault(kind: VaultConfig["kind"], secret: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12)),
    iterations = 310000,
    key = await deriveKey(secret, salt, iterations);
  const sentinel = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode("winkbooth-vault"),
  );
  const cfg: VaultConfig = {
    id: "vault",
    kind,
    salt,
    iv,
    sentinel,
    iterations,
  };
  await db.vault.put(cfg);
  return key;
}
export async function unlockVault(secret: string) {
  const cfg = await db.vault.get("vault");
  if (!cfg) return null;
  try {
    const key = await deriveKey(secret, cfg.salt, cfg.iterations);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: cfg.iv as BufferSource },
      key,
      cfg.sentinel,
    );
    return new TextDecoder().decode(plain) === "winkbooth-vault" ? key : null;
  } catch {
    return null;
  }
}
export async function encryptBlob(blob: Blob, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return {
    cipher: await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      await blob.arrayBuffer(),
    ),
    iv,
  };
}
export async function decryptBlob(
  cipher: ArrayBuffer,
  iv: Uint8Array,
  key: CryptoKey,
  type = "image/png",
) {
  return new Blob(
    [
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv as BufferSource },
        key,
        cipher,
      ),
    ],
    { type },
  );
}
