"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

// ─── History types & helpers ───
interface TrackEntry {
  id: string;
  url: string;
  name: string;
  playedAt: number;
}

const HISTORY_KEY = "focus-room-recent-tracks";
const MAX_HISTORY = 10;

function getHistory(): TrackEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveHistory(entries: TrackEntry[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    /* quota exceeded — silently skip */
  }
}

export function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const playBtnRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const collapsedRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [prevVolume, setPrevVolume] = useState(0.7);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>("");
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [vizHeights, setVizHeights] = useState([4, 4, 4, 4, 4]);
  const [recentTracks, setRecentTracks] = useState<TrackEntry[]>([]);

  // ─── Helpers ───
  const formatTime = (t: number): string => {
    if (!Number.isFinite(t) || t < 0) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hasAudio = !!audioSrc;

  // ─── History management ───
  const addToHistory = useCallback((url: string, name: string) => {
    // Don't save blob:// URLs — they expire after page refresh
    if (url.startsWith("blob:")) return;
    const history = getHistory();
    const filtered = history.filter((e) => e.url !== url);
    const entry: TrackEntry = {
      id: window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url,
      name,
      playedAt: Date.now(),
    };
    filtered.unshift(entry);
    saveHistory(filtered);
    setRecentTracks(filtered.slice(0, MAX_HISTORY));
  }, []);

  const loadFromHistory = useCallback((entry: TrackEntry) => {
    setAudioSrc(entry.url);
    setAudioName(entry.name);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    // Re-save to bump it to top
    addToHistory(entry.url, entry.name);
  }, [addToHistory]);

  const removeFromHistory = useCallback((id: string) => {
    const history = getHistory();
    const filtered = history.filter((e) => e.id !== id);
    saveHistory(filtered);
    setRecentTracks(filtered);
  }, []);

  // Load history on mount
  useEffect(() => {
    setRecentTracks(getHistory());
  }, []);

  // ─── Source handlers ───
  const loadFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setAudioSrc(url);
    const name = file.name.replace(/\.[^/.]+$/, "");
    setAudioName(name);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const loadUrl = useCallback((url: string) => {
    setAudioSrc(url);
    const name = url.split("/").pop()?.split("?")[0] || "Audio Stream";
    setAudioName(name);
    setShowUrlInput(false);
    setUrlInput("");
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    addToHistory(url, decodeURIComponent(name));
  }, [addToHistory]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadFile(file);
    },
    [loadFile]
  );

  const handleUrlSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (urlInput.trim()) loadUrl(urlInput.trim());
    },
    [urlInput, loadUrl]
  );

  // ─── Playback controls ───
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;
    if (isPlaying) audio.pause();
    else audio.play().catch(() => {});
  }, [isPlaying, audioSrc]);

  const skipTime = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + seconds));
  }, []);

  const seekTo = useCallback((clientX: number) => {
    const bar = progressBarRef.current;
    const audio = audioRef.current;
    if (!bar || !audio || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  }, [duration]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setPrevVolume(v || 0.7);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const toggleMute = useCallback(() => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
      if (audioRef.current) audioRef.current.volume = 0;
    } else {
      setVolume(prevVolume);
      if (audioRef.current) audioRef.current.volume = prevVolume;
    }
  }, [volume, prevVolume]);

  // ─── Draggable progress ───
  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    setIsSeeking(true);
    seekTo(e.clientX);
  }, [seekTo]);

  useEffect(() => {
    if (!isSeeking) return;
    const onMove = (e: MouseEvent) => seekTo(e.clientX);
    const onUp = () => setIsSeeking(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isSeeking, seekTo]);

  // ─── Audio events ───
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      audio.play().catch(() => {});
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.volume = volume;
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [audioSrc, volume]);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (audioSrc?.startsWith("blob:")) URL.revokeObjectURL(audioSrc);
    };
  }, [audioSrc]);

  // ─── Animate viz bars in bubble (pause when collapsed to save CPU) ───
  useEffect(() => {
    if (!isPlaying || collapsed) {
      setVizHeights([4, 4, 4, 4, 4]);
      return;
    }
    const interval = setInterval(() => {
      setVizHeights(Array.from({ length: 5 }, () => gsap.utils.random(4, 14)));
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, collapsed]);

  // ─── GSAP: collapse/expand animation ───
  useGSAP(() => {
    if (!expandedRef.current || !collapsedRef.current) return;
    const tl = gsap.timeline({ defaults: { duration: 0.4, ease: "power3.inOut" } });

    if (collapsed) {
      // Collapse: expanded out, collapsed in
      tl.to(expandedRef.current, {
        autoAlpha: 0,
        scale: 0.95,
        y: 20,
        duration: 0.3,
        ease: "power3.in",
      }, 0)
      .fromTo(collapsedRef.current, {
        autoAlpha: 0,
        scale: 0.85,
        y: 20,
      }, {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: 0.4,
        ease: "back.out(1.4)",
      }, 0.08);
    } else {
      // Expand: collapsed out, expanded in
      tl.to(collapsedRef.current, {
        autoAlpha: 0,
        scale: 0.85,
        y: 20,
        duration: 0.25,
        ease: "power3.in",
      }, 0)
      .fromTo(expandedRef.current, {
        autoAlpha: 0,
        scale: 0.95,
        y: 20,
      }, {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: 0.45,
        ease: "back.out(1.2)",
      }, 0.06);
    }

    return () => { tl.kill(); };
  }, [collapsed]);

  // ─── GSAP: panel enter animation ───
  useGSAP(() => {
    if (!expandedRef.current || collapsed) return;
    const panel = expandedRef.current;
    const elements = panel.querySelectorAll<HTMLElement>(".ap-row");
    if (!elements.length) return;
    gsap.fromTo(elements, {
      autoAlpha: 0,
      y: 8,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.35,
      stagger: 0.06,
      ease: "power2.out",
      delay: 0.1,
    });
  }, { dependencies: [collapsed], scope: expandedRef, revertOnUpdate: true });

  // ─── GSAP: progress bar fill ───
  useGSAP(() => {
    if (!progressFillRef.current || !duration) return;
    gsap.to(progressFillRef.current, {
      width: `${progressPct}%`,
      duration: isSeeking ? 0 : 0.2,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, { dependencies: [progressPct, isSeeking], revertOnUpdate: false });

  // Play button scale spring
  useGSAP(() => {
    if (!playBtnRef.current) return;
    gsap.fromTo(playBtnRef.current, { scale: 0.88 }, { scale: 1, duration: 0.35, ease: "back.out(1.8)" });
  }, { dependencies: [isPlaying] });

  // ─── Render ───
  return (
    <div ref={containerRef} className="audio-bubble-wrapper pointer-events-none">
      {/* Hidden elements */}
      {audioSrc && <audio ref={audioRef} src={audioSrc} preload="metadata" loop />}
      <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a" onChange={handleFileChange} className="hidden" />

      {/* ===== COLLAPSED: Mini music bubble ===== */}
      <div ref={collapsedRef} style={collapsed ? undefined : { visibility: "hidden" }}>
        <button
          onClick={() => setCollapsed(false)}
          className={`audio-bubble${isPlaying ? " audio-bubble--active" : ""}`}
          aria-label="Expand music player"
        >
          <span className="audio-bubble__hint">{hasAudio ? "Player" : "Add Music"}</span>
          {/* Icon area */}
          <div className="audio-bubble__icon">
            {hasAudio ? (
              <div className="audio-bubble__viz">
                {vizHeights.map((h, i) => (
                  <div
                    key={i}
                    className="audio-bubble__viz-bar"
                    style={{ height: h, transition: "height 0.4s ease" }}
                  />
                ))}
              </div>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white/35">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
              </svg>
            )}
          </div>
          {/* Track name */}
          <span className="audio-bubble__text">
            {hasAudio ? audioName : "Add Music"}
          </span>
          {/* Mini progress bar (only when playing) */}
          {hasAudio && (
            <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-white/30 transition-[width] duration-300 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </button>
      </div>

      {/* ===== EXPANDED: Full player panel (above bubble) ===== */}
      <div ref={expandedRef} className="audio-panel-expanded" style={collapsed ? { visibility: "hidden" } : undefined}>
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-zinc-900/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)_inset] p-5 select-none">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.01] pointer-events-none rounded-3xl" />

          <div className="relative z-[1] flex flex-col gap-4">
            {/* ── Row 1: Minimize + Source ── */}
            <div className="ap-row flex items-center justify-between">
              <button onClick={() => setCollapsed(true)} className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.06] text-white/30 hover:bg-white/[0.1] hover:text-white/60 transition-colors" aria-label="Minimize player">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M10 4L4 10M4 4v6h6" />
                </svg>
              </button>
              <div className="flex items-center gap-1.5">
                <button onClick={() => fileInputRef.current?.click()} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.1] transition-all font-medium">
                  Upload
                </button>
                <button onClick={() => setShowUrlInput(!showUrlInput)} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.1] transition-all font-medium">
                  {showUrlInput ? "✕" : "URL"}
                </button>
              </div>
            </div>

            {/* URL input */}
            {showUrlInput && (
              <form onSubmit={handleUrlSubmit} className="ap-row flex gap-2">
                <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste audio link..." autoFocus
                  className="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/[0.08] text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/20 focus:bg-black/40 transition-colors" />
                <button type="submit" className="px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.06] text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.12] transition-all duration-200 active:scale-95">Load</button>
              </form>
            )}

            {/* ── Recent tracks ── */}
            {recentTracks.length > 0 && (
              <div className="ap-row flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-white/20 font-medium px-0.5">Recent</span>
                <div className="flex flex-col gap-0.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                  {recentTracks.map((track) => (
                    <div
                      key={track.id}
                      className="group/recent flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
                      onClick={() => loadFromHistory(track)}
                    >
                      {/* Play icon */}
                      <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 group-hover/recent:bg-white/[0.12] transition-colors">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-white/30 group-hover/recent:text-white/60 ml-0.5">
                          <polygon points="7,2 22,12 7,22" />
                        </svg>
                      </div>
                      {/* Name + time */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/60 truncate font-medium">{track.name}</p>
                        <p className="text-[9px] text-white/20 mt-px">{formatRelativeTime(track.playedAt)}</p>
                      </div>
                      {/* Remove button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromHistory(track.id); }}
                        className="w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover/recent:opacity-100 text-white/15 hover:text-white/40 hover:bg-white/[0.06] transition-all"
                        aria-label="Remove from history"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Row 2: Track info ── */}
            <div className="ap-row flex items-center gap-3">
              <div className="relative flex items-end justify-center gap-[2px] w-10 h-10 rounded-2xl shrink-0 bg-white/[0.06] border border-white/[0.06] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-white/[0.02]" />
                {hasAudio ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-[3px] rounded-full bg-white/60" style={{ height: vizHeights[i], transition: "height 0.35s ease" }} />
                  ))
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 truncate tracking-tight">{hasAudio ? audioName : "Ready to focus"}</p>
                <p className="text-[10px] text-white/25 mt-0.5 uppercase tracking-wider">{hasAudio ? (isPlaying ? "Playing" : "Paused") : "Add music"}</p>
              </div>
            </div>

            {/* ── Row 3: Progress bar ── */}
            <div className="ap-row flex flex-col gap-1.5">
              <div ref={progressBarRef} onMouseDown={handleProgressMouseDown}
                className={`relative h-1 rounded-full bg-white/[0.08] cursor-pointer group transition-[height] duration-150 ${isSeeking ? "h-[5px]" : "hover:h-[5px]"}`}>
                <div ref={progressFillRef} className="absolute inset-y-0 left-0 rounded-full bg-white/50 group-hover:bg-white/70 transition-colors" style={{ width: "0%" }} />
                <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-opacity duration-150 ${isSeeking ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  style={{ left: `calc(${Math.max(0, Math.min(100, progressPct))}% - 6px)` }} />
              </div>
              <div className="flex justify-between text-[10px] tabular-nums text-white/25 font-medium tracking-wide">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* ── Row 4: Play controls + Volume ── */}
            <div className="ap-row flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => skipTime(-10)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${hasAudio ? "text-white/25 hover:text-white/50 hover:bg-white/[0.06]" : "text-white/[0.08] cursor-default"}`}
                  disabled={!hasAudio} aria-label="Rewind 10s">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" /></svg>
                </button>
                <button ref={playBtnRef} onClick={togglePlay}
                  className={`w-11 h-11 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${hasAudio ? "bg-white/90 text-zinc-900 hover:bg-white hover:shadow-[0_4px_20px_rgba(255,255,255,0.2)]" : "bg-white/[0.06] text-white/15 cursor-default"}`}
                  disabled={!hasAudio} aria-label={isPlaying ? "Pause" : "Play"}>
                  {isPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="5" height="18" rx="1.5" /><rect x="14" y="3" width="5" height="18" rx="1.5" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><polygon points="7,2 22,12 7,22" /></svg>
                  )}
                </button>
                <button onClick={() => skipTime(10)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${hasAudio ? "text-white/25 hover:text-white/50 hover:bg-white/[0.06]" : "text-white/[0.08] cursor-default"}`}
                  disabled={!hasAudio} aria-label="Forward 10s">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" /></svg>
                </button>
              </div>
              {/* Volume */}
              <div className="flex items-center gap-2 group/vol">
                <button onClick={toggleMute} className="text-white/30 hover:text-white/60 transition-colors" aria-label={volume === 0 ? "Unmute" : "Mute"}>
                  {volume === 0 ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                  ) : volume < 0.5 ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                  )}
                </button>
                <div className="relative w-16 h-6 flex items-center">
                  <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange}
                    className="w-full h-1 appearance-none rounded-full cursor-pointer bg-white/[0.08] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/70 [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(255,255,255,0.3)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:hover:bg-white opacity-60 group-hover/vol:opacity-100 transition-opacity duration-200"
                    aria-label="Volume" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
