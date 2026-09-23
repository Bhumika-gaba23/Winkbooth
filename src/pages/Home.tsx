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
      <section className="catalog-section legacy-catalog" aria-hidden="true">
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
      <section className="mood-studio">
        <div className="mood-studio-head">
          <div>
            <span className="kicker">YOUR ROLL STARTS WITH A FEELING</span>
            <h2>Set the mood.<br /><em>We’ll handle the rest.</em></h2>
          </div>
          <p>{layouts.length} ways to frame the moment<br />with zero wrong answers</p>
        </div>
        <div className="mood-studio-body">
          <div className="mood-choices" role="list" aria-label="Choose a mood">
            {[
              { id: "All", title: "Go with the flow", copy: "A little bit of everything", mark: "✦" },
              { id: "Main Character", title: "Main character", copy: "Make the ordinary iconic", mark: "★" },
              { id: "Soft Launch", title: "Soft launch", copy: "Small moments, big feeling", mark: "♡" },
            ].map((mood) => (
              <button key={mood.id} className={`mood-choice ${cat === mood.id ? "selected" : ""}`} onClick={() => setCat(mood.id)} role="listitem">
                <span className="mood-mark">{mood.mark}</span>
                <span><b>{mood.title}</b><small>{mood.copy}</small></span>
                <ArrowRight />
              </button>
            ))}
          </div>
          <div className="mood-preview">
            <div className="mood-preview-copy">
              <span className="kicker">{cat === "All" ? "THE OPENING FRAME" : cat.toUpperCase()}</span>
              <h3>{shown[0]?.name ?? "Your first frame"}</h3>
              <p>Start with this feeling, then make every detail yours in the booth.</p>
              <Link className="button primary" to={shown[0] ? `/booth?frame=${shown[0].id}` : "/booth"}>Use this mood <ArrowRight /></Link>
            </div>
            {shown[0] && <div className="mood-preview-art" style={{ "--c1": shown[0].colors[0], "--c2": shown[0].colors[1], "--c3": shown[0].colors[2] } as React.CSSProperties}>
              <span>{shown[0].motif}</span><div /><div /><div /><b>WinkBooth</b>
            </div>}
          </div>
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
