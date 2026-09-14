import { Shell, SectionTitle } from "../components";
export function Privacy() {
  return (
    <Shell>
      <article className="page prose">
        <SectionTitle
          eyebrow="PLAIN-LANGUAGE PRIVACY"
          title="Your photos stay yours."
        />
        <h2>On-device by design</h2>
        <p>
          WinkBooth processes camera frames, edits, exports, gallery items, and
          settings inside your browser. We do not operate a photo server,
          user-account system, advertising network, or analytics pipeline.
        </p>
        <h2>Browser storage</h2>
        <p>
          Saved photos use IndexedDB on this device. Your browser can remove
          site data, and clearing it permanently removes your gallery. Download
          important memories as a backup.
        </p>
        <h2>Private vault</h2>
        <p>
          Hidden images are encrypted with AES-GCM using a key derived from your
          PIN, password, or pattern. The key is not stored. Forgotten vault
          credentials cannot be recovered.
        </p>
        <h2>Permissions</h2>
        <p>
          Camera access is used only for live preview and capture. Clipboard,
          sharing, printing, and persistent-storage permissions are requested
          only when you use those features.
        </p>
      </article>
    </Shell>
  );
}
export function Terms() {
  return (
    <Shell>
      <article className="page prose">
        <SectionTitle
          eyebrow="THE FRIENDLY TERMS"
          title="Use WinkBooth kindly."
        />
        <p>
          WinkBooth is provided as a free, browser-based creative tool. You
          keep ownership of the photos and original artwork you create or
          upload.
        </p>
        <h2>Your uploads</h2>
        <p>
          Only use images and custom frames you have permission to use. Do not
          use the service to violate another person’s privacy or
          intellectual-property rights.
        </p>
        <h2>No recovery guarantee</h2>
        <p>
          Because there are no accounts or cloud backups, we cannot restore
          cleared browser data or recover forgotten vault credentials.
        </p>
        <h2>Device differences</h2>
        <p>
          Camera, flash, zoom, clipboard, share, video encoding, and printing
          capabilities vary by browser and hardware. WinkBooth provides
          graceful alternatives where practical.
        </p>
      </article>
    </Shell>
  );
}
