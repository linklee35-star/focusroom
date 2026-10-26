"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useAudio } from "@/context/AudioContext";
import { SCENES } from "@/lib/constants";
import { useFullscreen } from "@/hooks/useFullscreen";
import { FocusPanel } from "@/components/sections/FocusPanel";
import type { SceneSlug } from "@/types";

gsap.registerPlugin(useGSAP);

// ─── Helpers ───
const formatTime = (t: number): string => {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const COVER_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#27272a"/><stop offset="100%" style="stop-color:#18181b"/>
    </linearGradient></defs>
    <rect width="300" height="300" fill="url(#g)"/>
    <circle cx="150" cy="120" r="24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
    <path d="M126 120a24 24 0 0 1 24-24" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round"/>
    <rect x="138" y="160" width="3" height="24" rx="1.5" fill="rgba(255,255,255,0.12)"/>
    <rect x="144" y="168" width="3" height="16" rx="1.5" fill="rgba(255,255,255,0.12)"/>
    <rect x="150" y="156" width="3" height="28" rx="1.5" fill="rgba(255,255,255,0.2)"/>
    <rect x="156" y="164" width="3" height="20" rx="1.5" fill="rgba(255,255,255,0.12)"/>
    <rect x="162" y="172" width="3" height="12" rx="1.5" fill="rgba(255,255,255,0.1)"/>
  </svg>`
)}`;

// ─── Extract dominant color from album art (Spotify-style background) ───
function getDominantColor(img: HTMLImageElement): string {
  try {
    const size = 40;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue; // skip transparent pixels
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    if (count === 0) return "";
    return `${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}`;
  } catch {
    return ""; // canvas tainted (cross-origin) — silently skip
  }
}

// ─── LRC lyric parsing ───
interface LyricLine {
  time: number; // seconds
  text: string;
}

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  lrc.split("\n").forEach((line) => {
    const matches: RegExpExecArray[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(line)) !== null) matches.push(m);
    if (matches.length === 0) return;
    const text = line.replace(regex, "").trim();
    if (!text) return;
    matches.forEach((mm) => {
      const min = parseInt(mm[1], 10);
      const sec = parseInt(mm[2], 10);
      const frac = mm[3] ? parseInt(mm[3].padEnd(3, "0").slice(0, 3), 10) : 0;
      lines.push({ time: min * 60 + sec + frac / 1000, text });
    });
  });
  return lines.sort((a, b) => a.time - b.time);
}

// ─── Vinyl Record (static visual; rotation handled by parent wrapper) ───
function VinylRecord() {
  return (
    <div
      className="absolute inset-[6%] rounded-full z-0"
      style={{
        background: "conic-gradient(from 0deg, #141417 0deg 4deg, #2a2a2f 4deg 8deg, #17171a 8deg 12deg, #2e2e33 12deg 16deg, #1a1a1e 16deg 20deg, #26262b 20deg 24deg, #16161a 24deg 28deg, #2b2b30 28deg 32deg, #1a1a1e 32deg 36deg)",
      }}
    >
      {/* Grooves (concentric rings) */}
      <div className="absolute inset-[12%] rounded-full bg-zinc-900/80 border border-white/[0.04]" />
      <div className="absolute inset-[18%] rounded-full bg-zinc-900/60 border border-white/[0.03]" />
      <div className="absolute inset-[24%] rounded-full bg-zinc-900/50 border border-white/[0.03]" />
      <div className="absolute inset-[29%] rounded-full bg-zinc-900/40 border border-white/[0.02]" />
    </div>
  );
}

// ─── Page ───
export default function PlayerPage() {
  const router = useRouter();
  const { state, togglePlay, seek, skipTime, setVolume, loadFile } = useAudio();
  const { track, isPlaying, currentTime, duration, volume } = state;
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  const containerRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const vinylWrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const trackInfoRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.7);
  const [bgMode, setBgMode] = useState<"cover" | "scene">("cover");
  const [isDragging, setIsDragging] = useState(false);
  const [coverMode, setCoverMode] = useState<"square" | "vinyl">("square");

  const hasAudio = !!track;
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const coverSrc = track?.coverUrl || COVER_PLACEHOLDER;
  const [dominantColor, setDominantColor] = useState<string>("");
  const [sceneBg, setSceneBg] = useState<string>("");

  // Read the originating scene from the URL query to use as backdrop
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("scene") as SceneSlug | null;
    if (slug && SCENES[slug]) {
      setSceneBg(SCENES[slug].modes.outdoor);
    }
  }, []);

  // Extract dominant color from cover for Spotify-style ambient background
  useEffect(() => {
    if (!track?.coverUrl) {
      setDominantColor("");
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setDominantColor(getDominantColor(img));
    img.onerror = () => setDominantColor("");
    img.src = track.coverUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [track?.coverUrl]);

  // ─── Lyrics ───
  const lyrics = useMemo(() => (track?.lyric ? parseLrc(track.lyric) : []), [track?.lyric]);
  const lyricRef = useRef<HTMLDivElement>(null);

  const currentLineIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) idx = i;
      else break;
    }
    return idx;
  }, [lyrics, currentTime]);

  // Auto-scroll active lyric line to center
  useEffect(() => {
    if (currentLineIndex < 0 || !lyricRef.current) return;
    const activeEl = lyricRef.current.querySelector(
      `[data-line="${currentLineIndex}"]`
    ) as HTMLElement | null;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentLineIndex]);

  // Smooth glide-in animation on the active lyric line (natural, no bounce)
  useEffect(() => {
    if (currentLineIndex < 0 || !lyricRef.current) return;
    const activeEl = lyricRef.current.querySelector(
      `[data-line="${currentLineIndex}"]`
    ) as HTMLElement | null;
    if (activeEl) {
      gsap.fromTo(
        activeEl,
        { scale: 0.85, y: 20, filter: "blur(5px)" },
        {
          scale: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.65,
          ease: "power3.out",
          overwrite: "auto",
        }
      );
    }
  }, [currentLineIndex]);

  // ─── Redirect if no track loaded ───
  useEffect(() => {
    if (!track) {
      // Small delay so GSAP exit can play
      const t = setTimeout(() => router.push("/"), 50);
      return () => clearTimeout(t);
    }
  }, [track, router]);

  // ─── GSAP: Entrance animation ───
  useGSAP(() => {
    if (!containerRef.current) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // Background fade in
    tl.fromTo(
      containerRef.current,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.4 },
      0
    );

    // Cover scales up from small (用 opacity 而非 autoAlpha，避免 visibility 卡死)
    tl.fromTo(
      coverRef.current,
      { scale: 0.7, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.3)" },
      0.05
    );

    // Back button + title
    tl.fromTo(
      [backBtnRef.current, trackInfoRef.current],
      { y: -16, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.04 },
      0.2
    );

    // Controls
    tl.fromTo(
      controlsRef.current,
      { y: 20, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.45 },
      0.3
    );

    return () => {
      tl.kill();
    };
  }, []);

  // ─── GSAP: Cover animation (breathing for square, single-wrapper spin for vinyl) ───
  useEffect(() => {
    const cover = coverRef.current;
    const vinyl = vinylWrapRef.current;

    if (coverMode === "vinyl") {
      // 黑胶形式：外层容器统一旋转（唱片 + 标签一起，完美同步不抖）
      if (vinyl) {
        gsap.killTweensOf(vinyl);
        gsap.set(vinyl, { rotation: 0, autoAlpha: 1 });
        if (isPlaying) {
          gsap.to(vinyl, {
            rotation: "+=360",
            duration: 4,
            ease: "none",
            repeat: -1,
            overwrite: "auto",
          });
        }
      }
    } else {
      // 方形封面：只呼吸，不旋转
      if (vinyl) gsap.killTweensOf(vinyl);
      if (cover) {
        gsap.killTweensOf(cover);
        // 关键：kill 后恢复可见（否则入场动画的 autoAlpha:0 会卡住封面）
        gsap.set(cover, { rotation: 0, autoAlpha: 1 });
        if (isPlaying) {
          gsap.to(cover, {
            scale: 1.03,
            duration: 1.5,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            overwrite: "auto",
          });
        } else {
          gsap.to(cover, {
            scale: 1,
            duration: 0.4,
            ease: "power2.out",
            overwrite: "auto",
          });
        }
      }
    }

    return () => {
      if (coverRef.current) gsap.killTweensOf(coverRef.current);
      if (vinylWrapRef.current) gsap.killTweensOf(vinylWrapRef.current);
    };
  }, [isPlaying, coverMode]);

  // ─── Seek ───
  const seekTo = useCallback(
    (clientX: number) => {
      const bar = progressBarRef.current;
      if (!bar || !duration) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      seek(ratio * duration);
    },
    [duration, seek]
  );

  const handleProgressMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsSeeking(true);
      seekTo(e.clientX);
    },
    [seekTo]
  );

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

  // ─── Volume ───
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      setVolume(v);
      setPrevVolume(v || 0.7);
    },
    [setVolume]
  );

  const toggleMute = useCallback(() => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume);
    }
  }, [volume, prevVolume, setVolume]);

  // ─── Drag & drop import (window-level listener, most reliable) ───
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      setIsDragging(true);
    };
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer?.files;
      const file = files?.[0];
      if (file) loadFile(file);
    };
    const onDragLeave = (e: DragEvent) => {
      // 只有真正离开窗口时才取消高亮
      if (e.relatedTarget === null) setIsDragging(false);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragleave", onDragLeave);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragleave", onDragLeave);
    };
  }, [loadFile]);

  // ─── File picker import (click fallback) ───
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) loadFile(file);
      e.target.value = "";
    },
    [loadFile]
  );

  if (!track) return null;

  return (
    <main
      ref={containerRef}
      className="player-page fixed inset-0 z-[100] bg-zinc-950 overflow-hidden flex flex-col select-none"
      style={{ opacity: 0 }}
    >
      {/* Scene backdrop — deep immersion (scene mode) */}
      {bgMode === "scene" && sceneBg && (
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sceneBg}
            alt=""
            className="w-full h-full object-cover scale-105 blur-md brightness-[0.72] saturate-140"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/15 via-zinc-950/25 to-zinc-950/55" />
        </div>
      )}
      {/* Cover-color ambient (cover mode) */}
      {bgMode === "cover" && (
        <>
          {/* Spotify-style ambient background from album color */}
          <div
            className="absolute inset-0 pointer-events-none transition-[background] duration-700"
            style={{
              background: dominantColor
                ? `radial-gradient(ellipse 90% 65% at 50% 0%, rgba(${dominantColor}, 0.35) 0%, rgba(${dominantColor}, 0.12) 45%, transparent 75%)`
                : "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.04) 0%, transparent 60%)",
            }}
          />
          {/* Ambient light orb */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none transition-opacity duration-500"
            style={{
              background: dominantColor
                ? `radial-gradient(circle, rgba(${dominantColor}, 0.28) 0%, transparent 60%)`
                : "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 60%)",
              opacity: isPlaying ? 0.8 : 0.3,
            }}
          />
        </>
      )}

      {/* ─── Top bar ─── */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5">
        <button
          ref={backBtnRef}
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.08] border border-white/[0.18] text-white/50 backdrop-blur-md backdrop-saturate-150 hover:text-white/80 hover:bg-white/[0.14] transition-all duration-200 text-sm font-medium"
          aria-label="Back to room"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Back</span>
        </button>

        <span className="text-xs text-white/20 tracking-widest uppercase font-medium">
          Music Player
        </span>

        <div className="flex items-center gap-2">
          {/* Import audio (click fallback for drag) */}
          <button
            onClick={openFilePicker}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.08] border border-white/[0.18] text-white/50 backdrop-blur-md backdrop-saturate-150 hover:text-white/80 hover:bg-white/[0.14] transition-all duration-200 text-xs font-medium"
            aria-label="导入音频"
            title="导入音频文件"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4" /><path d="M6 10l6-6 6 6" />
              <path d="M4 20h16" />
            </svg>
            <span>导入</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.flac,.m4a,.wav,.ogg,.aac"
            className="hidden"
            onChange={handleFileChange}
          />
          {/* Background mode toggle */}
          <button
            onClick={() => setBgMode((m) => (m === "cover" ? "scene" : "cover"))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.08] border border-white/[0.18] text-white/50 backdrop-blur-md backdrop-saturate-150 hover:text-white/80 hover:bg-white/[0.14] transition-all duration-200 text-xs font-medium"
            aria-label="Toggle background"
            title={bgMode === "cover" ? "切换到场景背景" : "切换到封面取色背景"}
          >
            {bgMode === "cover" ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l5-5 4 4 3-3 6 6" />
                <path d="M14 5l3 3 3-3-3-3-3 3z" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 20h18" />
                <path d="M5 20l5-8 4 6 3-4 2 6" />
              </svg>
            )}
            <span>{bgMode === "cover" ? "场景" : "取色"}</span>
          </button>
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.08] border border-white/[0.18] text-white/50 backdrop-blur-md backdrop-saturate-150 hover:text-white/80 hover:bg-white/[0.14] transition-all duration-200"
            aria-label={isFullscreen ? "退出全屏" : "全屏"}
            title={isFullscreen ? "退出全屏" : "全屏"}
          >
            {isFullscreen ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 14h4v4" /><path d="M20 10h-4V6" />
                <path d="M14 10l7-7" /><path d="M3 21l7-7" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10h4V6" /><path d="M20 14h-4v4" />
                <path d="M10 3l7 7" /><path d="M10 21l-7-7" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ─── Main: cover (left) + lyrics (right) ─── */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-6 lg:gap-14 px-6 lg:px-16 -mt-2 min-h-0">
        {/* Left: album art + track info */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="relative w-[min(40vw,58vh,440px)] aspect-square">
            {coverMode === "vinyl" ? (
              /* ── 黑胶形式：统一旋转容器（唱片 + 标签一起转）── */
              <div ref={vinylWrapRef} className="absolute inset-0">
                <VinylRecord />
                <div className="absolute inset-[30%] rounded-full overflow-hidden z-10 shadow-[0_0_50px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.1)_inset]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverSrc} alt={track.name} className="w-full h-full object-cover" />
                </div>
                {/* 中心孔 */}
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <div className="w-3 h-3 rounded-full bg-zinc-950 border border-zinc-600 shadow-[0_0_0_3px_rgba(255,255,255,0.05)]" />
                </div>
              </div>
            ) : (
              /* ── 方形封面：无黑胶，只呼吸 ── */
              <div
                ref={coverRef}
                className="absolute inset-[13%] z-10 rounded-[24px] overflow-hidden shadow-[0_24px_90px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.08)_inset]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverSrc} alt={track.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/10 pointer-events-none" />
              </div>
            )}
          </div>

          <div ref={trackInfoRef} className="text-center mt-5">
            <h2 className="text-2xl font-semibold text-white/90 tracking-tight truncate max-w-[340px]">
              {track.name}
            </h2>
            {track.artist && (
              <p className="text-sm text-white/40 mt-1.5 font-light tracking-wide">
                {track.artist}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 mt-3">
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                  isPlaying ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-white/15"
                }`}
              />
              <span className="text-[10px] text-white/25 tracking-widest uppercase font-medium">
                {isPlaying ? "Now Playing" : "Paused"}
              </span>
            </div>
            {/* Cover style toggle */}
            <button
              onClick={() => setCoverMode((m) => (m === "square" ? "vinyl" : "square"))}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.14] text-white/45 hover:text-white/75 hover:bg-white/[0.1] transition-all duration-200 text-[11px] font-medium"
              aria-label="切换封面形式"
              title={coverMode === "square" ? "切换为黑胶形式" : "切换为封面形式"}
            >
              {coverMode === "square" ? "◉ 黑胶" : "▣ 封面"}
            </button>
          </div>
        </div>

        {/* Right: lyrics */}
        <div className="flex-1 min-w-0 w-full lg:w-auto lg:max-w-[640px] flex flex-col justify-center min-h-[160px] lg:min-h-0">
          {lyrics.length > 0 ? (
            <div
              ref={lyricRef}
              className="flex-1 overflow-y-auto custom-scrollbar lg:max-h-[62vh] px-2 py-6"
              style={{ maskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)" }}
            >
              <div className="flex flex-col items-center gap-3 lg:gap-4">
                {lyrics.map((line, i) => {
                  const isActive = i === currentLineIndex;
                  const isPast = i < currentLineIndex;
                  return (
                    <p
                      key={i}
                      data-line={i}
                      className={`text-center leading-snug transition-[font-size,color] duration-500 ease-out ${
                        isActive
                          ? "text-white text-3xl lg:text-4xl font-semibold tracking-tight drop-shadow-[0_0_24px_rgba(255,255,255,0.35)]"
                          : isPast
                          ? "text-white/30 text-xl lg:text-2xl font-medium"
                          : "text-white/20 text-lg lg:text-xl font-light"
                      }`}
                    >
                      {line.text}
                    </p>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/20">
              <p className="text-sm font-medium">暂无歌词</p>
              <p className="text-xs mt-2 text-white/15">正在识别，或该歌曲无歌词</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Bottom: progress + controls + volume ─── */}
      <div className="relative z-10 px-6 lg:px-16 pb-3">
        <div className="w-full max-w-3xl mx-auto">
          <div
            ref={progressBarRef}
            onMouseDown={handleProgressMouseDown}
            className={`relative h-1 rounded-full bg-white/[0.06] cursor-pointer group transition-[height] duration-150 ${
              isSeeking ? "h-[5px]" : "hover:h-[5px]"
            }`}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/50 group-hover:bg-white/70 transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.5)] transition-opacity duration-150 ${
                isSeeking ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
              style={{ left: `calc(${progressPct}% - 7px)` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] tabular-nums text-white/20 font-medium tracking-wide">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 mt-5 mb-2">
          <button
            onClick={() => skipTime(-15)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-white/20 hover:text-white/45 hover:bg-white/[0.04] transition-all duration-200 active:scale-90"
            aria-label="Rewind 15s"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
              <text x="8" y="14" fontSize="5" fill="currentColor" fontWeight="600">15</text>
            </svg>
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-white/90 text-zinc-900 hover:bg-white hover:shadow-[0_6px_30px_rgba(255,255,255,0.15)] transition-all duration-200 active:scale-90"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="3" width="5" height="18" rx="1.5" />
                <rect x="14" y="3" width="5" height="18" rx="1.5" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="ml-1">
                <polygon points="7,2 22,12 7,22" />
              </svg>
            )}
          </button>

          <button
            onClick={() => skipTime(15)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-white/20 hover:text-white/45 hover:bg-white/[0.04] transition-all duration-200 active:scale-90"
            aria-label="Forward 15s"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
              <text x="8" y="14" fontSize="5" fill="currentColor" fontWeight="600">15</text>
            </svg>
          </button>
        </div>

        <div ref={controlsRef} className="flex items-center justify-center gap-3 group/vol">
          <button
            onClick={toggleMute}
            className="text-white/20 hover:text-white/45 transition-colors"
            aria-label={volume === 0 ? "Unmute" : "Mute"}
          >
            {volume === 0 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : volume < 0.5 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>
          <div className="relative w-24 h-6 flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full h-1 appearance-none rounded-full cursor-pointer bg-white/[0.06] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/60 [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(255,255,255,0.3)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:hover:bg-white opacity-50 group-hover/vol:opacity-100 transition-opacity duration-200"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>

      {/* ─── Drag & drop overlay ─── */}
      {isDragging && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-zinc-950/70 backdrop-blur-md pointer-events-none">
          <div className="flex flex-col items-center gap-3 px-8 py-6 rounded-3xl border border-white/[0.18] bg-white/[0.06]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/70">
              <path d="M12 16V4" /><path d="M6 10l6-6 6 6" />
              <path d="M4 20h16" />
            </svg>
            <p className="text-sm text-white/80 font-medium">松开以导入音频</p>
          </div>
        </div>
      )}

      {/* ─── Bottom spacer for safe area ─── */}
      <div className="h-[env(safe-area-inset-bottom,20px)]" />

      {/* ─── Floating pomodoro timer (kept in player) ─── */}
      <FocusPanel />
    </main>
  );
}
