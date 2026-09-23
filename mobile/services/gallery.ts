import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { randomUUID } from "expo-crypto";
import type { Album, GalleryPhoto } from "@/types/domain";

const dbPromise = SQLite.openDatabaseAsync("winkbooth.db");
export async function initGallery() { const db = await dbPromise; await db.execAsync("CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY NOT NULL, createdAt INTEGER NOT NULL, layoutId TEXT NOT NULL, imageUri TEXT NOT NULL, thumbnailUri TEXT, videoUri TEXT, albumId TEXT, hidden INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS albums (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, createdAt INTEGER NOT NULL, pinned INTEGER NOT NULL DEFAULT 0, coverPhotoId TEXT);"); }
export async function photos(hidden = false) { const db = await dbPromise; return db.getAllAsync<GalleryPhoto>("SELECT * FROM photos WHERE hidden = ? ORDER BY createdAt DESC", [hidden ? 1 : 0]); }
export async function albums() { const db = await dbPromise; return db.getAllAsync<Album>("SELECT * FROM albums ORDER BY pinned DESC, createdAt DESC"); }
export async function savePhoto(input: Omit<GalleryPhoto, "id" | "createdAt">) { const db = await dbPromise; const photo = { ...input, id: randomUUID(), createdAt: Date.now() }; await db.runAsync("INSERT INTO photos (id, createdAt, layoutId, imageUri, thumbnailUri, videoUri, albumId, hidden) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [photo.id, photo.createdAt, photo.layoutId, photo.imageUri, photo.thumbnailUri ?? null, photo.videoUri ?? null, photo.albumId ?? null, photo.hidden ? 1 : 0]); return photo; }
export async function deletePhoto(photo: GalleryPhoto) { const db = await dbPromise; await db.runAsync("DELETE FROM photos WHERE id = ?", [photo.id]); await Promise.all([photo.imageUri, photo.thumbnailUri, photo.videoUri].filter(Boolean).map((uri) => FileSystem.deleteAsync(uri!, { idempotent: true }))); }
export async function createAlbum(name: string) { const db = await dbPromise; const album = { id: randomUUID(), name, createdAt: Date.now(), pinned: false }; await db.runAsync("INSERT INTO albums (id, name, createdAt, pinned) VALUES (?, ?, ?, ?)", [album.id, album.name, album.createdAt, 0]); return album; }
