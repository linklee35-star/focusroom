"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

// ─── Types ───

export interface TrackMeta {
  name: string;
  artist?: string;
  coverUrl?: string; // album art — blob URL or external URL
  lyric?: string; // LRC-formatted synced lyrics
  source: string; // audio src
}

export interface TrackEntry {
  id: string;
  url: string;
  name: string;
  playedAt: number;
}

interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  track: TrackMeta | null;
  /** Whether a user-set cover exists (vs auto-extracted) */
  hasCustomCover: boolean;
  /** Raw frequency data for visualizer (128 bins) */
  freqData: Uint8Array | null;
}

interface AudioContextValue {
  state: AudioState;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  /** Load a File (extract metadata + cover) */
  loadFile: (file: File) => Promise<void>;
  /** Load from URL */
  loadUrl: (url: string) => void;
  /** Set custom album cover image */
  setCustomCover: (file: File) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  skipTime: (seconds: number) => void;
  /** Recent play history (URL-loaded tracks only, localStorage persisted) */
  recentTracks: TrackEntry[];
  removeFromHistory: (id: string) => void;
  loadFromHistory: (entry: TrackEntry) => void;
}

// ─── Context ───

const AudioCtx = createContext<AudioContextValue | null>(null);

// ─── Helpers ───

const DEFAULT_VOLUME = 0.7;
const HISTORY_KEY = "focus-room-recent-tracks";
const MAX_HISTORY = 10;

function getHistory(): TrackEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveHistory(entries: TrackEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    /* quota exceeded — silently skip */
  }
}

async function extractFileMeta(file: File): Promise<{
  name: string;
  artist?: string;
  coverUrl?: string;
}> {
  // Dynamic import — jsmediatags is only needed here
  const { read } = await import("jsmediatags");

  return new Promise((resolve) => {
    const fallback = { name: file.name.replace(/\.[^/.]+$/, "") };
    let settled = false;
    const done = (result: { name: string; artist?: string; coverUrl?: string }) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(result);
      }
    };
    // 超时保护：jsmediatags 卡住时返回 fallback
    const timer = setTimeout(() => done(fallback), 5000);

    try {
      read(file, {
        onSuccess(tag: any) {
          const tags = tag.tags;
          const name = tags.title || fallback.name;
          const artist = tags.artist || undefined;

          let coverUrl: string | undefined;
          if (tags.picture) {
            const pic = tags.picture;
            // pic.data is a Uint8Array or array of bytes
            const bytes = pic.data;
            const blob = new Blob([bytes], { type: pic.format || "image/jpeg" });
            coverUrl = URL.createObjectURL(blob);
          }

          done({ name, artist, coverUrl });
        },
        onError() {
          done(fallback);
        },
      });
    } catch {
      done(fallback);
    }
  });
}

// ─── Provider ───

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const volumeBeforeMute = useRef(DEFAULT_VOLUME);

  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: DEFAULT_VOLUME,
    track: null,
    hasCustomCover: false,
    freqData: null,
  });

  const [recentTracks, setRecentTracks] = useState<TrackEntry[]>([]);

  // Load play history on mount
  useEffect(() => {
    setRecentTracks(getHistory());
  }, []);

  // ─── Audio element init ───
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "metadata";
    audio.loop = true;
    audio.volume = DEFAULT_VOLUME;
    audioRef.current = audio;

    // Set up Web Audio API analyser
    const actx = new AudioContext();
    audioCtxRef.current = actx;
    const analyser = actx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    const source = actx.createMediaElementSource(audio);
    sourceNodeRef.current = source;
    source.connect(analyser);
    analyser.connect(actx.destination);

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
      actx.close().catch(() => {});
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ─── Freq data update loop ───
  useEffect(() => {
    if (!analyserRef.current || !state.isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (!state.isPlaying) setState((s) => ({ ...s, freqData: null }));
      return;
    }

    const analyser = analyserRef.current;
    const buffer = new Uint8Array(analyser.frequencyBinCount);
    const update = () => {
      analyser.getByteFrequencyData(buffer);
      setState((s) => ({ ...s, freqData: new Uint8Array(buffer) }));
      rafRef.current = requestAnimationFrame(update);
    };
    update();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state.isPlaying]);

  // ─── Audio event listeners ───
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setState((s) => ({ ...s, isPlaying: true }));
    const onPause = () => setState((s) => ({ ...s, isPlaying: false }));
    const onEnded = () => setState((s) => ({ ...s, isPlaying: false }));
    const onTimeUpdate = () =>
      setState((s) => ({ ...s, currentTime: audio.currentTime }));
    const onLoadedMetadata = () => {
      setState((s) => ({ ...s, duration: audio.duration }));
      audio.play().catch(() => {});
    };
    const onVolumeChange = () =>
      setState((s) => ({ ...s, volume: audio.volume }));

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("volumechange", onVolumeChange);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("volumechange", onVolumeChange);
    };
  }, []);

  // ─── Actions ───

  // 用歌名调网易云识别，自动补封面/歌手/歌词（不覆盖已提取的内嵌元数据）
  const recognize = useCallback(async (name: string, source: string) => {
    try {
      const res = await fetch(`/api/music/recognize?q=${encodeURIComponent(name)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.error) return;
      setState((s) => {
        if (!s.track || s.track.source !== source) return s; // 歌曲已切换，丢弃
        return {
          ...s,
          track: {
            ...s.track,
            coverUrl: s.track.coverUrl || data.coverUrl || s.track.coverUrl,
            artist: s.track.artist || data.artist || s.track.artist,
            lyric: data.lyric || s.track.lyric,
          },
        };
      });
    } catch {
      /* recognition is best-effort */
    }
  }, []);

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

  const removeFromHistory = useCallback((id: string) => {
    const history = getHistory();
    const filtered = history.filter((e) => e.id !== id);
    saveHistory(filtered);
    setRecentTracks(filtered);
  }, []);

  const loadFile = useCallback(async (file: File) => {
    const audio = audioRef.current;
    if (!audio) return;

    const src = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^/.]+$/, "");
    audio.pause();
    audio.src = src;
    audio.load();

    // 先立即设置 track（文件名 + blob URL），保证歌曲立即可加载播放
    setState((s) => ({
      ...s,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      track: { name, source: src },
      hasCustomCover: false,
    }));
    recognize(name, src);

    // 异步提取元数据（封面/歌手），成功后补充（不阻塞加载）
    try {
      const meta = await extractFileMeta(file);
      setState((s) => {
        if (!s.track || s.track.source !== src) return s; // 歌曲已切换，丢弃
        return {
          ...s,
          track: {
            ...s.track,
            name: meta.name || s.track.name,
            artist: meta.artist || s.track.artist,
            coverUrl: meta.coverUrl || s.track.coverUrl,
          },
        };
      });
    } catch {
      /* 元数据提取失败，忽略 */
    }
  }, [recognize]);

  const loadUrl = useCallback((url: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.src = url;
    audio.load();

    const name = url.split("/").pop()?.split("?")[0] || "Audio Stream";
    setState((s) => ({
      ...s,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      track: { name, source: url },
      hasCustomCover: false,
    }));
    addToHistory(url, name);
    recognize(name, url);
  }, [addToHistory, recognize]);

  const loadFromHistory = useCallback((entry: TrackEntry) => {
    loadUrl(entry.url);
  }, [loadUrl]);

  const setCustomCover = useCallback(
    (file: File) => {
      const coverUrl = URL.createObjectURL(file);
      setState((s) => ({
        ...s,
        track: s.track ? { ...s.track, coverUrl } : null,
        hasCustomCover: true,
      }));
    },
    []
  );

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !state.track) return;
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    audio.play().catch(() => {});
  }, [state.track]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) pause();
    else play();
  }, [state.isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !state.duration) return;
    audio.currentTime = Math.max(0, Math.min(state.duration, time));
  }, [state.duration]);

  const setVolume = useCallback((v: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = v;
    volumeBeforeMute.current = v || DEFAULT_VOLUME;
  }, []);

  const skipTime = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    seek(audio.currentTime + seconds);
  }, [seek]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (state.track?.source?.startsWith("blob:")) {
        URL.revokeObjectURL(state.track.source);
      }
      if (state.track?.coverUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(state.track.coverUrl);
      }
    };
  }, []);

  const value: AudioContextValue = {
    state,
    audioRef,
    loadFile,
    loadUrl,
    setCustomCover,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    skipTime,
    recentTracks,
    removeFromHistory,
    loadFromHistory,
  };

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

// ─── Hook ───

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio must be used within AudioProvider");
  return ctx;
}
