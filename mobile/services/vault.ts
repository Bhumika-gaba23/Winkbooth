import * as SQLite from "expo-sqlite";
import type { GalleryPhoto } from "@/types/domain";

const escapeKey = (secret: string) => secret.replace(/'/g, "''");

/** Opens the SQLCipher vault only after the user supplies their secret. */
export async function openVault(secret: string) {
  if (secret.trim().length < 4) throw new Error("Use at least four characters for the vault secret.");
  const db = await SQLite.openDatabaseAsync("winkbooth-vault.db");
  await db.execAsync(`PRAGMA key = '${escapeKey(secret)}';`);
  await db.execAsync("CREATE TABLE IF NOT EXISTS vault_media (id TEXT PRIMARY KEY NOT NULL, createdAt INTEGER NOT NULL, layoutId TEXT NOT NULL, encryptedBlob BLOB NOT NULL, mimeType TEXT NOT NULL, width INTEGER, height INTEGER);");
  return db;
}

export async function vaultMetadata(secret: string) {
  const db = await openVault(secret);
  return db.getAllAsync<Pick<GalleryPhoto, "id" | "createdAt" | "layoutId">>("SELECT id, createdAt, layoutId FROM vault_media ORDER BY createdAt DESC");
}

export async function storeEncryptedVaultMedia(secret: string, input: { id: string; createdAt: number; layoutId: string; encryptedBlob: Uint8Array; mimeType: string; width?: number; height?: number }) {
  const db = await openVault(secret);
  await db.runAsync("INSERT OR REPLACE INTO vault_media (id, createdAt, layoutId, encryptedBlob, mimeType, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)", [input.id, input.createdAt, input.layoutId, input.encryptedBlob, input.mimeType, input.width ?? null, input.height ?? null]);
}
