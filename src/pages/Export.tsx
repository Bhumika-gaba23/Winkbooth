import {
  Check,
  Clipboard,
  Download,
  Edit3,
  Film,
  Image,
  Printer,
  Share2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../db";
import { Button, Shell, SectionTitle } from "../components";
import { compose, downloadBlob } from "../render";
import { useBooth } from "../store";
export default function ExportPage() {
  const { session, reset } = useBooth(),
    nav = useNavigate(),
    [url, setUrl] = useState(""),
    [blob, setBlob] = useState<Blob>(),
    [saved, setSaved] = useState(false),
    [note, setNote] = useState("");
  useEffect(() => {
    if (session.shots.length)
      compose(session, 2).then((c) =>
        c.toBlob((b) => {
          if (b) {
            setBlob(b);
            setUrl(URL.createObjectURL(b));
          }
        }, "image/png"),
      );
  }, [session]);
  const toast = (s: string) => {
    setNote(s);
    setTimeout(() => setNote(""), 2600);
  };
  if (!session.shots.length)
    return (
      <Shell>
        <section className="page">
          <SectionTitle
            title="Nothing to export yet"
            copy="Complete a photo session first."
          />
          <Button kind="primary" onClick={() => nav("/booth")}>
            Enter the booth
          </Button>
        </section>
      </Shell>
    );
  async function share() {
    if (!blob) return;
    const file = new File([blob], `winkbooth-${Date.now()}.png`, {
      type: "image/png",
    });
    try {
      if (
        navigator.share &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      )
        await navigator.share({
          files: [file],
          title: "My WinkBooth strip",
          text: "A little moment from WinkBooth ✿",
        });
      else {
        downloadBlob(blob, file.name);
        toast("Sharing is unavailable — downloaded instead.");
      }
    } catch (e) {
      if ((e as DOMException).name !== "AbortError")
        toast("Could not share this time.");
    }
  }
  async function copy() {
    if (!blob) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      toast("Copied to clipboard ✿");
    } catch {
      toast("Clipboard image copy is not supported here.");
    }
  }
  function print(two = false) {
    const w = window.open("", "_blank", "width=700,height=900");
    if (!w) {
      toast("Pop-up blocked — allow pop-ups to print.");
      return;
    }
    w.document.write(
      `<style>@page{size:${two ? "4in 6in" : "auto"};margin:0}body{margin:0;display:flex;width:${two ? "4in" : "100vw"};height:${two ? "6in" : "100vh"}}img{width:${two ? "2in" : "100%"};height:100%;object-fit:contain}</style><img src="${url}">${two ? `<img src="${url}">` : ""}<script>onload=()=>setTimeout(()=>print(),250)<\/script>`,
    );
    w.document.close();
  }
  async function save() {
    if (!blob) return;
    await db.photos.put({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      layoutId: session.layoutId,
      hidden: false,
      image: blob,
      thumbnail: blob,
    });
    setSaved(true);
    toast("Saved to your gallery ✿");
  }
  return (
    <Shell>
      <section className="page export-page">
        <div className="title-row">
          <SectionTitle
            title="Take it home"
            copy="Download, share, print, or keep it in your gallery."
          />
          <Button onClick={() => nav("/edit")}>
            <Edit3 /> Edit
          </Button>
        </div>
        <div className="export-grid">
          <div className="export-preview">
            {url ? (
              <img src={url} />
            ) : (
              <div className="loader">Making your photo…</div>
            )}
          </div>
          <aside>
            <div className="action-grid">
              <Button
                kind="primary"
                onClick={() =>
                  blob && downloadBlob(blob, `winkbooth-${Date.now()}.png`)
                }
              >
                <Download /> Download HD
              </Button>
              <Button onClick={() => print(false)}>
                <Printer /> Print
              </Button>
              <Button onClick={share}>
                <Share2 /> Share
              </Button>
              <Button onClick={copy}>
                <Clipboard /> Copy
              </Button>
            </div>
            <div className="motion-card">
              <span>PHOTOS IN MOTION</span>
              <h3>Loop the little moments.</h3>
              <div>
                <Button
                  onClick={() =>
                    toast("GIF rendering needs multi-capture photos.")
                  }
                >
                  <Image /> GIF
                </Button>
                <Button
                  onClick={() =>
                    toast(
                      "MP4 requires WebCodecs support and multi-capture photos.",
                    )
                  }
                >
                  <Film /> MP4 (HD)
                </Button>
                {session.boomerang && (
                  <Button
                    kind="primary"
                    onClick={() =>
                      downloadBlob(
                        session.boomerang!,
                        `winkbooth-boomerang-${Date.now()}.webm`,
                      )
                    }
                  >
                    <Film /> Boomerang
                  </Button>
                )}
              </div>
              <p>
                Multi-capture and boomerang exports appear when motion frames
                are available.
              </p>
            </div>
            <div className="print-card">
              <h3>Real-world prints</h3>
              <Button onClick={() => print(false)}>
                Single at actual size
              </Button>
              <Button
                onClick={() => print(true)}
                disabled={!session.layoutId.startsWith("strip")}
              >
                2-up on 4×6
              </Button>
            </div>
            <div className="caption">
              <p>
                “Proof that the best plans are the ones you can hold. Made in
                WinkBooth ✿”
              </p>
              <Button
                onClick={() =>
                  navigator.clipboard
                    .writeText(
                      "Proof that the best plans are the ones you can hold. Made in WinkBooth ✿",
                    )
                    .then(() => toast("Caption copied"))
                }
              >
                Copy caption
              </Button>
            </div>
            <div className="action-grid">
              <Button
                kind={saved ? "outline" : "primary"}
                disabled={saved}
                onClick={save}
              >
                {saved ? (
                  <>
                    <Check /> Saved
                  </>
                ) : (
                  <>Save to gallery</>
                )}
              </Button>
              <Button
                onClick={() => {
                  reset();
                  nav("/booth");
                }}
              >
                New session
              </Button>
            </div>
          </aside>
        </div>
        {note && <div className="toast">{note}</div>}
      </section>
    </Shell>
  );
}
