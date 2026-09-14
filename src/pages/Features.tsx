import {
  Camera,
  Download,
  Film,
  Frame,
  Images,
  LockKeyhole,
  Palette,
  Printer,
  ScanFace,
  Smartphone,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Shell, SectionTitle } from "../components";
const items = [
  [
    Frame,
    "Photo layouts",
    "Classic strips, roomy grids, and pocket prints sized for the real world.",
  ],
  [
    Palette,
    "74 original frames",
    "Soft florals, bubbly chrome, tiny animals, and playful character scenes.",
  ],
  [
    Sparkles,
    "40+ filters",
    "From clean daylight to lo-fi film, dreamy bloom, comic ink, and risograph.",
  ],
  [
    Film,
    "GIF, MP4 & boomerang",
    "Build share-ready loops directly on your device.",
  ],
  [
    Printer,
    "Print at home",
    "Single strips or two-up 4×6 sheets with accurate physical sizing.",
  ],
  [
    ScanFace,
    "Stickers and words",
    "Drag, pinch, twist, recolor, duplicate, and layer your story.",
  ],
  [
    Images,
    "Albums that stay local",
    "Organize, filter, batch-select, download, share, and print.",
  ],
  [
    LockKeyhole,
    "An encrypted vault",
    "Hide private photos behind a PIN, password, or pattern.",
  ],
  [
    Camera,
    "Pick the best take",
    "Capture extra options for every slot and keep your favorite.",
  ],
  [
    Smartphone,
    "Real camera controls",
    "Timer, zoom, brightness, mirror, focus, flash, and camera switching.",
  ],
  [
    WifiOff,
    "Works offline",
    "Install it like an app and keep creating without a connection.",
  ],
  [
    Download,
    "Free and private",
    "No signup, watermark, tracking script, or surprise upload.",
  ],
];
const faqs = [
  [
    "Does WinkBooth upload my photos?",
    "No. Camera frames, edits, gallery images, and vault data stay in this browser on this device.",
  ],
  [
    "Can I use my own frame?",
    "Yes. Upload PNG, WEBP, or JPG artwork and define exactly where each photo should appear.",
  ],
  [
    "Does it work on phones?",
    "Yes. WinkBooth is designed for iPhone, iPad, Android, laptops, and desktop browsers. Hardware controls appear when the device supports them.",
  ],
  [
    "Can I print the strips?",
    "Yes. Print at 2×6, 4×6, or 3×4, including two 2×6 strips on one borderless 4×6 sheet.",
  ],
  [
    "What if I forget my vault code?",
    "There is no recovery route: the code is never stored and encrypted photos cannot be opened without it.",
  ],
];
export default function Features() {
  return (
    <Shell>
      <section className="page">
        <SectionTitle
          eyebrow="VOLUME 02 — THE DETAILS"
          title="A whole photobooth, tucked inside a tab."
          copy="Everything you need to make, style, keep, and print a tiny time capsule."
        />
        <div className="feature-list">
          {items.map(([Icon, title, copy], i) => {
            const I = Icon as typeof Camera;
            return (
              <article key={String(title)}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <I />
                <div>
                  <h2>{String(title)}</h2>
                  <p>{String(copy)}</p>
                </div>
              </article>
            );
          })}
        </div>
        <section className="faq">
          <span className="kicker">THE SMALL PRINT</span>
          <h2>Questions, answered.</h2>
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <b>+</b>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
        <div className="center">
          <Link className="button primary" to="/booth">
            <Camera /> Enter the booth
          </Link>
        </div>
      </section>
    </Shell>
  );
}
