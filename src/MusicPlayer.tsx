import {
  ChevronDown,
  Heart,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { backgroundTracks } from "./music";

const STORAGE_KEY = "winkbooth.music-player";
const DEFAULT_VOLUME = 0.18;

type StoredPlayer = {
  trackIndex: number;
  volume: number;
  muted: boolean;
  position: number;
  shouldPlay: boolean;
};

const readStoredPlayer = (): StoredPlayer => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<StoredPlayer>;
    return {
      trackIndex: Math.min(Math.max(value.trackIndex ?? 0, 0), backgroundTracks.length - 1),
      volume: Math.min(Math.max(value.volume ?? DEFAULT_VOLUME, 0), 1),
      muted: value.muted ?? false,
      position: Math.max(value.position ?? 0, 0),
      shouldPlay: value.shouldPlay ?? true,
    };
  } catch {
    return { trackIndex: 0, volume: DEFAULT_VOLUME, muted: false, position: 0, shouldPlay: true };
  }
};

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
};

export default function MusicPlayer() {
  const stored = useRef(readStoredPlayer()).current;
  const audioRef = useRef<HTMLAudioElement>(null);
  const shouldPlayRef = useRef(stored.shouldPlay);
  const playbackRequestRef = useRef(0);
  const restorePositionRef = useRef(stored.position);
  const failedTracksRef = useRef(new Set<number>());
  const [trackIndex, setTrackIndex] = useState(stored.trackIndex);
  const [volume, setVolume] = useState(stored.volume);
  const [muted, setMuted] = useState(stored.muted);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [currentTime, setCurrentTime] = useState(stored.position);
  const [duration, setDuration] = useState(0);
  const [sourceEnabled, setSourceEnabled] = useState(true);
  const playerRef = useRef<HTMLElement>(null);
  const track = backgroundTracks[trackIndex];

  useEffect(() => {
    if (!expanded) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !playerRef.current?.contains(target)) setExpanded(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [expanded]);

  const persist = (position: number) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ trackIndex, volume, muted, position, shouldPlay: shouldPlayRef.current }),
    );
  };

  const startPlayback = async () => {
    const audio = audioRef.current;
    if (unavailable) return;
    // A paused player deliberately releases its source. Reattach it first;
    // loadedmetadata will restore the saved position and continue playback.
    if (!sourceEnabled) {
      shouldPlayRef.current = true;
      setBlocked(false);
      setSourceEnabled(true);
      return;
    }
    if (!audio) return;
    const requestId = ++playbackRequestRef.current;
    shouldPlayRef.current = true;
    setBlocked(false);
    try {
      await audio.play();
      // A play promise may resolve after the user has already pressed pause.
      // Never let that stale request restart the music.
      if (requestId !== playbackRequestRef.current || !shouldPlayRef.current) {
        audio.pause();
        return;
      }
      setIsPlaying(true);
    } catch {
      if (requestId !== playbackRequestRef.current || !shouldPlayRef.current) return;
      setIsPlaying(false);
      setBlocked(true);
    }
  };

  const pausePlayback = () => {
    const audio = audioRef.current;
    const position = audio?.currentTime ?? currentTime;
    shouldPlayRef.current = false;
    playbackRequestRef.current += 1;
    restorePositionRef.current = position;
    audio?.pause();
    // Removing the source is an intentional hard stop. It prevents an
    // in-flight autoplay promise or media-session event from resuming sound.
    setSourceEnabled(false);
    setIsPlaying(false);
    persist(position);
  };

  const togglePlayback = () => {
    // `HTMLAudioElement.paused` is authoritative. React state can briefly lag
    // while autoplay resolves, which previously let a visible Pause control
    // issue another play request instead of stopping the live audio.
    if (audioRef.current && !audioRef.current.paused) {
      pausePlayback();
      return;
    }
    void startPlayback();
  };

  const changeTrack = (direction: 1 | -1) => {
    const candidates = backgroundTracks.map((_, offset) =>
      (trackIndex + direction * (offset + 1) + backgroundTracks.length) % backgroundTracks.length,
    );
    const next = candidates.find((index) => !failedTracksRef.current.has(index));
    if (next === undefined) {
      shouldPlayRef.current = false;
      setUnavailable(true);
      setIsPlaying(false);
      return;
    }
    restorePositionRef.current = 0;
    playbackRequestRef.current += 1;
    audioRef.current?.pause();
    setCurrentTime(0);
    setDuration(0);
    setTrackIndex(next);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    persist(currentTime);
  }, [trackIndex, volume, muted]);

  useEffect(() => () => persist(audioRef.current?.currentTime ?? currentTime), []);

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const restoredPosition = Math.min(restorePositionRef.current, Math.max(audio.duration - 0.1, 0));
    audio.currentTime = restoredPosition;
    restorePositionRef.current = 0;
    setCurrentTime(restoredPosition);
    setDuration(audio.duration);
    if (shouldPlayRef.current) void startPlayback();
  };

  const handleTimeUpdate = () => {
    const time = audioRef.current?.currentTime ?? 0;
    setCurrentTime(time);
    if (Math.round(time) % 5 === 0) persist(time);
  };

  const handleEnded = () => {
    shouldPlayRef.current = true;
    changeTrack(1);
  };

  const handleError = () => {
    failedTracksRef.current.add(trackIndex);
    changeTrack(1);
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
    persist(time);
  };

  return (
    <aside ref={playerRef} className={`music-player ${expanded ? "is-expanded" : ""}`} aria-label="Background music player">
      <audio
        key={sourceEnabled ? track.id : "music-paused"}
        ref={audioRef}
        src={sourceEnabled ? track.src : undefined}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        onPlay={() => {
          if (!shouldPlayRef.current) {
            audioRef.current?.pause();
            return;
          }
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
      />
      <div className="music-player-status" aria-live="polite">
        {unavailable ? "Music is unavailable" : blocked ? "Tap to play background music" : isPlaying ? `Playing ${track.title}` : "Background music paused"}
      </div>
      <button
        className="music-player-toggle"
        type="button"
        aria-label={expanded ? "Collapse music player" : "Open music player"}
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        <span className={`music-record ${isPlaying ? "is-spinning" : ""}`} aria-hidden="true"><Music2 /></span>
      </button>
      <button
        className="music-quick-play"
        type="button"
        onClick={togglePlayback}
        disabled={unavailable}
        aria-label={isPlaying ? "Pause background music" : "Play background music"}
      >
        {isPlaying ? <Pause /> : <Play />}
      </button>
      <section className="music-player-card">
        <div className="music-player-topline">
          <span className="music-player-kicker"><Heart /> now playing</span>
          <button type="button" className="music-collapse" onClick={() => setExpanded(false)} aria-label="Collapse music player"><ChevronDown /></button>
        </div>
        <div className="music-track-row">
          <span className={`music-record music-record-large ${isPlaying ? "is-spinning" : ""}`} aria-hidden="true"><Music2 /></span>
          <div>
            <b>{track.title}</b>
            <small>{track.mood} · {track.artist}</small>
          </div>
        </div>
        <label className="music-progress" aria-label="Track progress">
          <input type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} onChange={(event) => seek(+event.target.value)} disabled={!duration || unavailable} />
          <span>{formatTime(currentTime)} <i>/</i> {formatTime(duration)}</span>
        </label>
        <div className="music-controls">
          <button type="button" onClick={() => changeTrack(-1)} disabled={unavailable} aria-label="Previous track"><SkipBack /></button>
          <button type="button" className="music-main-control" onClick={togglePlayback} disabled={unavailable} aria-label={isPlaying ? "Pause background music" : "Play background music"}>{isPlaying ? <Pause /> : <Play />}</button>
          <button type="button" onClick={() => changeTrack(1)} disabled={unavailable} aria-label="Next track"><SkipForward /></button>
        </div>
        <div className="music-volume">
          <button type="button" onClick={() => setMuted((value) => !value)} disabled={unavailable} aria-label={muted ? "Unmute background music" : "Mute background music"}>{muted || volume === 0 ? <VolumeX /> : <Volume2 />}</button>
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => { setVolume(+event.target.value); if (+event.target.value > 0) setMuted(false); }} disabled={unavailable} aria-label="Background music volume" />
        </div>
        {blocked && <button type="button" className="music-unblock" onClick={() => void startPlayback()}>Tap to play ♡</button>}
        {unavailable && <p className="music-error">The playlist could not load right now.</p>}
      </section>
    </aside>
  );
}
