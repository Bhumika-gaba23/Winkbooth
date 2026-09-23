import Storage from "expo-sqlite/kv-store";
import { randomUUID } from "expo-crypto";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CaptureSession, ThemeId } from "@/types/domain";

const fresh = (): CaptureSession => ({ id: randomUUID(), createdAt: Date.now(), mode: "strip", layoutId: "strip2", shots: [], extras: [], filterId: "None", filterIntensity: 1, effectId: "None", overlays: [], frameColor: "#f5cc59", accentColor: "#fff8e3", labelColor: "#512437", showBranding: true, showDate: true, mirror: true });
type BoothState = { session: CaptureSession; theme: ThemeId; setSession: (patch: Partial<CaptureSession>) => void; setTheme: (theme: ThemeId) => void; reset: () => void };
export const useBoothStore = create<BoothState>()(persist((set) => ({ session: fresh(), theme: "classic", setSession: (patch) => set((state) => ({ session: { ...state.session, ...patch } })), setTheme: (theme) => set({ theme }), reset: () => set({ session: fresh() }) }), { name: "winkbooth.mobile", storage: createJSONStorage(() => Storage), partialize: (state) => ({ theme: state.theme, session: { ...state.session, boomerangUri: undefined } }) }));
