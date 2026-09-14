import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CaptureSession } from "./types";
const fresh = (): CaptureSession => ({
  id: crypto.randomUUID(),
  createdAt: Date.now(),
  mode: "strip",
  layoutId: "strip2",
  shots: [],
  extras: [],
  filterId: "none",
  filterIntensity: 1,
  effectId: "none",
  overlays: [],
  theme: {
    frame: "#f5cc59",
    accent: "#fff8e3",
    label: "#33291f",
    gradient: false,
  },
  showBranding: true,
  showDate: true,
  mirror: true,
});
type State = {
  session: CaptureSession;
  setSession: (p: Partial<CaptureSession>) => void;
  reset: () => void;
};
export const useBooth = create<State>()(
  persist(
    (set) => ({
      session: fresh(),
      setSession: (p) => set((s) => ({ session: { ...s.session, ...p } })),
      reset: () => set({ session: fresh() }),
    }),
    {
      name: "winkbooth.session",
      partialize: (s) => ({ session: { ...s.session, boomerang: undefined } }),
    },
  ),
);
