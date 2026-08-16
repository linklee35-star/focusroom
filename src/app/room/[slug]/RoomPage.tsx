"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { SCENES } from "@/lib/constants";
import { FocusPanel } from "@/components/sections/FocusPanel";
import { AudioPlayer } from "@/components/sections/AudioPlayer";
import { GlassButton } from "@/components/ui/GlassButton";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useFullscreen } from "@/hooks/useFullscreen";
import type { SceneSlug, SceneMode } from "@/types";

gsap.registerPlugin(useGSAP);

export function RoomPage() {
  const params = useParams();
  const slug = params.slug as SceneSlug;
  const scene = SCENES[slug];
  const containerRef = useRef<HTMLDivElement>(null);
  const clearImgRef = useRef<HTMLImageElement>(null);
  const blurredBgRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const [showFsHint, setShowFsHint] = useState(false);
  const [sceneMode, setSceneMode] = useState<SceneMode>("outdoor");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // All hooks must be called before any conditional returns
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);

  useKeyboard({
    f: () => toggleFullscreen(),
  }, true);

  const fsHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showHint = useCallback(() => {
    setShowFsHint(true);
    if (fsHintTimerRef.current) clearTimeout(fsHintTimerRef.current);
    fsHintTimerRef.current = setTimeout(() => setShowFsHint(false), 3000);
  }, []);

  // GSAP entrance animation
  useGSAP(() => {
    if (!containerRef.current || !scene) return;

    const root = containerRef.current;
    const header = root.querySelector<HTMLElement>(".room-header");
    const title = root.querySelector<HTMLElement>(".room-title");
    const desc = root.querySelector<HTMLElement>(".room-desc");
    const tags = root.querySelector<HTMLElement>(".room-tags");

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(".bg-blurred", {
      opacity: 0,
    }, {
      opacity: 1,
      duration: 1.0,
    }, 0);

    tl.fromTo(clearImgRef.current, {
      opacity: 0,
      scale: 1.03,
    }, {
      opacity: 1,
      scale: 1,
      duration: 1.2,
    }, 0.2);

    tl.fromTo(header, {
      autoAlpha: 0,
      y: -20,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.55,
    }, 0.5);

    tl.fromTo(title, {
      autoAlpha: 0,
      y: 24,
      filter: "blur(4px)",
    }, {
      autoAlpha: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 0.7,
    }, 0.7);

    tl.fromTo(desc, {
      autoAlpha: 0,
      y: 12,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.5,
    }, 1.05);

    tl.fromTo(tags, {
      autoAlpha: 0,
      y: 8,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.45,
      stagger: 0.05,
    }, 1.2);

    return () => { tl.kill(); };
  }, [slug]);

  // Fullscreen enter/exit text animation
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const header = root.querySelector<HTMLElement>(".room-header");
    const title = root.querySelector<HTMLElement>(".room-title");
    const desc = root.querySelector<HTMLElement>(".room-desc");
    const tags = root.querySelector<HTMLElement>(".room-tags");

    const targets = [header, title, desc, tags].filter(Boolean) as HTMLElement[];
    if (targets.length === 0) return;

    const tween = isFullscreen
      ? gsap.to(targets, {
          autoAlpha: 0,
          y: -12,
          duration: 0.6,
          ease: "power2.in",
          stagger: { each: 0.06, from: "start" },
        })
      : gsap.to(targets, {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          ease: "power3.out",
          stagger: { each: 0.07, from: "start" },
        });

    return () => { tween.kill(); };
  }, [isFullscreen]);

  // Mode toggle with crossfade (both layers)
  const toggleMode = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    const nextMode: SceneMode = sceneMode === "outdoor" ? "indoor" : "outdoor";

    // Crossfade both blurred bg and clear image simultaneously
    const targets = [clearImgRef.current, blurredBgRef.current].filter(Boolean) as HTMLElement[];
    gsap.to(targets, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        setSceneMode(nextMode);
        requestAnimationFrame(() => {
          gsap.to([clearImgRef.current, blurredBgRef.current].filter(Boolean), {
            opacity: 1,
            duration: 0.45,
            ease: "power2.out",
            onComplete: () => setIsTransitioning(false),
          });
        });
      },
    });
  }, [sceneMode, isTransitioning]);

  // Preload alternate mode image for instant switching
  useEffect(() => {
    if (!scene) return;
    const altImage = sceneMode === "outdoor" ? scene.modes.indoor : scene.modes.outdoor;
    const img = new Image();
    img.src = altImage;
    return () => { img.src = ""; };
  }, [scene, sceneMode]);

  // Cleanup fullscreen hint timer on unmount
  useEffect(() => {
    return () => {
      if (fsHintTimerRef.current) clearTimeout(fsHintTimerRef.current);
    };
  }, []);

  // Guard: after all hooks
  if (!scene) return null;

  const bgImage = scene.modes[sceneMode];

  return (
    <main ref={containerRef} className="relative min-h-[100dvh] overflow-hidden bg-zinc-950">
      {/* ===== Background layers ===== */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Layer 1: Blurred background (fills screen, no cropping) */}
        <div ref={blurredBgRef} className="bg-blurred absolute -inset-[80px] opacity-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bgImage}
            alt=""
            className="w-full h-full object-cover"
            aria-hidden="true"
            loading="eager"
            fetchPriority="high"
          />
          {/* Heavy blur + darken to create frosted glass effect */}
          <div className="absolute inset-0 backdrop-blur-3xl bg-black/40" />
        </div>

        {/* Layer 2: Clear contained image (full image, no crop) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={clearImgRef}
            src={bgImage}
            alt={scene.title}
            className="h-full w-full object-contain"
            style={{ opacity: 0 }}
            loading="eager"
            fetchPriority="high"
          />
        </div>

        {/* Layer 3: Edge frosted glass vignette */}
        <div className="absolute inset-0 z-[1] pointer-events-none">
          {/* Left edge frosted */}
          <div className="absolute left-0 top-0 bottom-0 w-[120px] bg-gradient-to-r from-zinc-950/80 to-transparent backdrop-blur-xl" />
          {/* Right edge frosted */}
          <div className="absolute right-0 top-0 bottom-0 w-[120px] bg-gradient-to-l from-zinc-950/80 to-transparent backdrop-blur-xl" />
          {/* Top edge frosted */}
          <div className="absolute left-0 right-0 top-0 h-[100px] bg-gradient-to-b from-zinc-950/60 to-transparent backdrop-blur-md" />
          {/* Bottom edge frosted */}
          <div className="absolute left-0 right-0 bottom-0 h-[100px] bg-gradient-to-t from-zinc-950/60 to-transparent backdrop-blur-md" />
        </div>

        {/* Layer 4: Dark overlay gradient for text readability */}
        <div className={`absolute inset-0 z-[2] bg-gradient-to-b ${scene.gradient}`} />
        <div className={`absolute inset-0 z-[2] ${scene.overlayOpacity}`} />
      </div>

      {/* Ambient light */}
      <div className="absolute inset-0 z-[3] pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-[100px] animate-breathe" />
      </div>

      {/* ===== Content ===== */}
      <div className="relative z-10 flex flex-col min-h-[100dvh]">
        {/* Top bar */}
        <header ref={headerRef} className="room-header flex items-center justify-between px-6 py-5">
          <Link href="/">
            <GlassButton variant="secondary" size="sm">
              ← Back
            </GlassButton>
          </Link>
          <span className="text-sm text-white/50 font-light tracking-wide">
            Focus Room
          </span>
          <div className="flex items-center gap-2">
            {/* Indoor/Outdoor mode toggle */}
            <button
              onClick={toggleMode}
              disabled={isTransitioning}
              className="flex items-center justify-center w-[72px] h-8 rounded-lg
                         bg-white/5 border border-white/10 text-white/40
                         hover:bg-white/10 hover:text-white/70 transition-all duration-200
                         disabled:opacity-50 disabled:cursor-wait"
              aria-label={`Switch to ${sceneMode === "outdoor" ? "indoor" : "outdoor"} mode`}
              title={sceneMode === "outdoor" ? "Switch to indoor view" : "Switch to outdoor view"}
            >
              {sceneMode === "outdoor" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9.5L5.5 7v0a5.5 5.5 0 0 1 13 0v0L21 9.5" />
                  <path d="M7 18v-5h10v5" />
                  <path d="M9 22h6" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>
            {/* Fullscreen toggle button */}
            <button
              onClick={() => { toggleFullscreen(); showHint(); }}
              className="flex items-center justify-center w-[72px] h-8 rounded-lg
                         bg-white/5 border border-white/10 text-white/40
                         hover:bg-white/10 hover:text-white/70 transition-all duration-200"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={`Press F to ${isFullscreen ? "exit" : "enter"} fullscreen`}
            >
              {isFullscreen ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14h4v4" /><path d="M20 10h-4V6" />
                  <path d="M14 10l7-7" /><path d="M3 21l7-7" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 10h4V6" /><path d="M20 14h-4v4" />
                  <path d="M10 3l7 7" /><path d="M10 21l-7-7" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Center content — fades on fullscreen */}
        <div ref={centerRef} className="room-center flex-1 flex flex-col items-center justify-center px-6 pb-48">
          <div className="text-center">
            <h1 className="room-title text-4xl sm:text-5xl md:text-6xl font-extralight tracking-tighter text-white mb-4 drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)]">
              {scene.title}
            </h1>
            <p className="room-desc text-base sm:text-lg text-white/70 font-light max-w-md mx-auto leading-relaxed drop-shadow-[0_1px_10px_rgba(0,0,0,0.6)]">
              {scene.description}
            </p>
          </div>

          {/* Scene info tags */}
          <div className="room-tags flex flex-wrap justify-center gap-2 mt-8">
            {scene.keywords.map((kw) => (
              <span
                key={kw}
                className="text-xs px-3 py-1 rounded-full bg-black/30 text-white/70 border border-white/[0.12] backdrop-blur-md"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Audio player — fixed bubble bottom-left, expands on click */}
      <AudioPlayer />

      {/* Floating focus panel — fixed bubble bottom-right */}
      <FocusPanel />

      {/* Fullscreen hint toast */}
      {showFsHint && (
        <div
          className="fixed top-20 left-1/2 z-[60] px-4 py-2 rounded-xl
                     bg-black/70 backdrop-blur-xl border border-white/10
                     text-xs text-white/80 font-light tracking-wide
                     pointer-events-none select-none"
          style={{ animation: "fullscreen-toast-in 0.35s ease-out forwards" }}
        >
          Press{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/15 text-white text-[11px] font-mono">
            F
          </kbd>{" "}
          to {isFullscreen ? "exit" : "enter"} fullscreen
        </div>
      )}
    </main>
  );
}
