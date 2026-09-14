export type BackgroundTrack = {
  id: string;
  title: string;
  artist: string;
  mood: string;
  src: string;
  license: "CC0 1.0";
  sourceUrl: string;
};

// Every bundled track is CC0. Keep this source metadata with the files so the
// playlist remains auditable when tracks are refreshed in the future.
export const backgroundTracks: BackgroundTrack[] = [
  {
    id: "jrpg-piano",
    title: "JRPG Piano",
    artist: "Joth",
    mood: "romantic piano",
    src: "/music/jrpg-piano.mp3",
    license: "CC0 1.0",
    sourceUrl: "https://opengameart.org/content/jrpg-piano",
  },
  {
    id: "lofi-hip-hop",
    title: "Lo-Fi Hip Hop",
    artist: "omfgdude",
    mood: "late-night café beats",
    src: "/music/lofi-hip-hop.ogg",
    license: "CC0 1.0",
    sourceUrl: "https://opengameart.org/content/lofi-hip-hop",
  },
  {
    id: "dreamy-loop",
    title: "Dreamy Ending Loop",
    artist: "omfgdude",
    mood: "dream-pop daydream",
    src: "/music/dreamy-loop.mp3",
    license: "CC0 1.0",
    sourceUrl: "https://opengameart.org/content/samurai-champloo-insipired-loop",
  },
];
