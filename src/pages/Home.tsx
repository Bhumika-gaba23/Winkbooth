import { ArrowRight, Camera, LockKeyhole, WandSparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { frames, layouts } from "../catalog";
import { Shell } from "../components";
export default function Home() {
  const [cat, setCat] = useState("All");
  const cats = ["All", "Date Night", "Sleepover", "Main Character", "Chaos", "Soft Launch"];
  const shown = (
    cat === "All" ? frames : frames.filter((_, index) => cats[(index % 5) + 1] === cat)
  ).slice(0, 12);
  return (
    <Shell>
      <section className="hero scrapbook-hero">
        <div className="hero-copy">
          <span className="kicker">ROLL 001 · READY TO DEVELOP</span>
          <h1>
            Keep the <em>chaos.</em>
            <br />
          </h1>
          <p>
            Pose, play, and turn your camera roll into printable photo
            strips—all privately in your browser.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/booth">
              <Camera /> Start a roll
            </Link>
            <Link className="button ghost" to="/gallery">
              Open memory wall <ArrowRight />
            </Link>
          </div>
          <div className="trust">
            <span>
              <LockKeyhole /> Private by physics
            </span>
            <span>
              <WandSparkles /> Made for the mess
            </span>
          </div>
        </div>
        <div className="hero-stack contact-sheet" aria-label="WinkBooth sample contact sheet">
          <div className="strip-card back">24 EXPOSURES</div>
          <div className="strip-card front">
            {["☺", "✌", "☻"].map((x, i) => (
              <div key={i} className={`sample s${i}`}>
                {x}
              </div>
            ))}
            <b>WinkBooth</b>
          </div>
          <div className="doodle">
            say
            <br />
            cheese! ↗
          </div>
        </div>
      </section>
      <section className="catalog-section">
        <div className="catalog-head">
          <div>
            <span className="kicker">PICK A MOOD, NOT A TEMPLATE</span>
            <h2>What kind of evidence are we making?</h2>
          </div>
          <p>
            {layouts.length} layouts · {frames.length} original frames
          </p>
        </div>
        <div className="chips">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cat === c ? "active" : ""}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="frame-grid">
          {shown.map((f) => (
            <Link to={`/booth?frame=${f.id}`} key={f.id} className="frame-card">
              <div
                className="frame-art"
                style={
                  {
                    "--c1": f.colors[0],
                    "--c2": f.colors[1],
                    "--c3": f.colors[2],
                  } as React.CSSProperties
                }
              >
                <span>{f.motif}</span>
                <div />
                <div />
                <div />
              </div>
              <h3>{f.name}</h3>
              <p>
                {f.category} · {layouts.find((l) => l.id === f.layoutId)?.size}
              </p>
            </Link>
          ))}
        </div>
      </section>
      <section className="privacy-banner">
        <span>NOTHING LEAVES YOUR DEVICE</span>
        <h2>
          Develop it. Doodle on it.
          <br />
          Keep it offline.
        </h2>
        <p>
          No account, no cloud uploads, no trackers. Even the private vault is
          encrypted right in your browser.
        </p>
        <Link className="button outline" to="/features">
          See every feature <ArrowRight />
        </Link>
      </section>
      <footer>
        <b>WinkBooth</b>
        <span>Evidence of a good time.</span>
        <div>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </footer>
    </Shell>
  );
}
