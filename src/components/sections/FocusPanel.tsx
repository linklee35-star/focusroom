"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { usePomodoro } from "@/hooks/usePomodoro";
import { useKeyboard } from "@/hooks/useKeyboard";
import { formatTime, formatMinutes, progressRatio } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

export function FocusPanel() {
  const { state, stats, toggle, reset, switchMode, customTimes, updateDurations } = usePomodoro();
  const [collapsed, setCollapsed] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [focusInput, setFocusInput] = useState(String(customTimes.focusMinutes));
  const [breakInput, setBreakInput] = useState(String(customTimes.breakMinutes));

  // Sync input values when customTimes loads from localStorage
  useEffect(() => {
    setFocusInput(String(customTimes.focusMinutes));
    setBreakInput(String(customTimes.breakMinutes));
  }, [customTimes.focusMinutes, customTimes.breakMinutes]);

  const isActive = state.isRunning && !state.isPaused;
  const progress = progressRatio(state.remainingSeconds, state.totalSeconds);

  // Refs for GSAP animation
  const containerRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef<HTMLDivElement>(null);
  const collapsedRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => { toggle(); }, [toggle]);
  const handleReset = useCallback(() => { reset(); }, [reset]);
  const handleSwitchMode = useCallback(() => {
    switchMode(state.mode === "focus" ? "break" : "focus");
  }, [state.mode, switchMode]);

  // Save custom times
  const handleSaveTimes = useCallback(() => {
    const f = Math.max(1, Math.min(120, parseInt(focusInput) || 25));
    const b = Math.max(1, Math.min(30, parseInt(breakInput) || 5));
    setFocusInput(String(f));
    setBreakInput(String(b));
    updateDurations({ focusMinutes: f, breakMinutes: b });
    setShowSettings(false);
  }, [focusInput, breakInput, updateDurations]);

  useKeyboard({ " ": handleToggle }, true);

  // GSAP expand/collapse animation
  useGSAP(() => {
    if (!expandedRef.current || !collapsedRef.current) return;

    const tl = gsap.timeline({ defaults: { duration: 0.4, ease: "power3.inOut" } });

    if (collapsed) {
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

  // Settings panel slide animation
  useGSAP(() => {
    if (!settingsRef.current) return;
    if (showSettings) {
      gsap.fromTo(settingsRef.current, {
        autoAlpha: 0,
        height: 0,
        y: -8,
      }, {
        autoAlpha: 1,
        height: "auto",
        y: 0,
        duration: 0.35,
        ease: "power2.out",
      });
    } else {
      gsap.to(settingsRef.current, {
        autoAlpha: 0,
        height: 0,
        y: -8,
        duration: 0.25,
        ease: "power2.in",
      });
    }
  }, [showSettings]);

  return (
    <div ref={containerRef} className="pomodoro-bubble-wrapper pointer-events-none">
      {/* ===== COLLAPSED: Mini bubble ===== */}
      <div
        ref={collapsedRef}
        className="pointer-events-auto"
        style={collapsed ? undefined : { visibility: "hidden" }}
      >
        <button
          onClick={() => setCollapsed(false)}
          className={`pomodoro-bubble${isActive ? " pomodoro-bubble--active" : ""}`}
          aria-label="Expand focus timer"
        >
          <span className="pomodoro-bubble__hint">Expand</span>

          {/* Mini progress ring */}
          <svg
            width="34" height="34" viewBox="0 0 34 34"
            className="pomodoro-bubble__ring -rotate-90 shrink-0"
          >
            <circle cx="17" cy="17" r="14" fill="none"
              stroke="rgba(0,0,0,0.06)" strokeWidth="2" />
            <circle cx="17" cy="17" r="14" fill="none"
              stroke="rgba(0,0,0,0.75)" strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 14}
              strokeDashoffset={2 * Math.PI * 14 * (1 - progress)}
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>

          {/* Time */}
          <span className="pomodoro-bubble__time">
            {formatTime(state.remainingSeconds)}
          </span>

          {/* Active indicator dot */}
          {isActive && (
            <span className="pomodoro-bubble__dot" />
          )}
        </button>
      </div>

      {/* ===== EXPANDED: Full panel (appears above bubble) ===== */}
      <div
        ref={expandedRef}
        className="pomodoro-panel-expanded"
        style={collapsed ? { visibility: "hidden" } : undefined}
      >
        <GlassCard
          variant="white"
          className="relative max-w-lg p-4 sm:p-6"
          hover={false}
        >
          <div className="flex flex-col gap-4">
            {/* Top row: stats + settings + collapse button */}
            <div className="flex items-center justify-between px-2">
              <div className="flex gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">
                    Today
                  </span>
                  <span className="text-sm text-zinc-600 font-light tabular-nums">
                    {formatMinutes(stats.todayMinutes)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">
                    Total
                  </span>
                  <span className="text-sm text-zinc-600 font-light tabular-nums">
                    {formatMinutes(stats.totalMinutes)}
                  </span>
                </div>
                {/* Custom time display */}
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">
                    Focus / Break
                  </span>
                  <span className="text-sm text-zinc-500 font-light tabular-nums">
                    {customTimes.focusMinutes}m / {customTimes.breakMinutes}m
                  </span>
                </div>
              </div>

              {/* Settings + Mode toggle + collapse */}
              <div className="flex items-center gap-2">
                {/* Settings button */}
                <button
                  onClick={() => setShowSettings(s => !s)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg
                             bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600
                             transition-colors"
                  aria-label="Timer settings"
                  title="Customize timer duration"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>

                <button
                  onClick={handleSwitchMode}
                  className="text-[11px] px-2.5 py-1 rounded-full
                             bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600
                             font-medium transition-colors"
                  aria-label={`Switch to ${state.mode === "focus" ? "break" : "focus"} mode`}
                >
                  {state.mode === "focus" ? "☕ Break" : "🎯 Focus"}
                </button>
                <button
                  onClick={() => setCollapsed(true)}
                  className="flex items-center justify-center w-7 h-7 rounded-lg
                             bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600
                             transition-colors"
                  aria-label="Minimize focus timer"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M10 4L4 10M4 4v6h6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Settings panel — always mounted, GSAP controls visibility */}
            <div
              ref={settingsRef}
              className="overflow-hidden"
              style={{ height: 0, visibility: "hidden" }}
            >
              <div className="bg-zinc-50 rounded-xl p-4 flex flex-col gap-3 border border-zinc-200/60">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
                  Timer Settings
                </span>
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[11px] text-zinc-400 font-medium">
                      Focus (1–120 min)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={focusInput}
                      onChange={e => setFocusInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200
                                 bg-white text-zinc-700 text-sm font-light tabular-nums
                                 focus:outline-none focus:ring-2 focus:ring-zinc-300
                                 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[11px] text-zinc-400 font-medium">
                      Break (1–30 min)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={breakInput}
                      onChange={e => setBreakInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-zinc-200
                                 bg-white text-zinc-700 text-sm font-light tabular-nums
                                 focus:outline-none focus:ring-2 focus:ring-zinc-300
                                 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-400
                               hover:bg-zinc-200 hover:text-zinc-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <GlassButton variant="primary" size="sm" onClick={handleSaveTimes}>
                    Save
                  </GlassButton>
                </div>
              </div>
            </div>

            {/* Timer display */}
            <div className="flex items-center justify-center gap-6 py-3">
              <CircularProgress progress={progress} size={130} strokeWidth={2} />
              <div className="flex flex-col items-start gap-1">
                <span className="text-4xl sm:text-5xl font-extralight tracking-tighter text-zinc-800 tabular-nums">
                  {formatTime(state.remainingSeconds)}
                </span>
                <span className="text-xs text-zinc-400 font-light uppercase tracking-widest">
                  {state.mode === "focus" ? "Focus" : "Break"}
                </span>
                <span className="text-[11px] text-zinc-400 font-light">
                  {state.completedPomodoros > 0 && `${state.completedPomodoros} sessions`}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <GlassButton
                variant={isActive ? "outline" : "primary"}
                size="md"
                onClick={handleToggle}
              >
                {!state.isRunning ? "Start" : state.isPaused ? "Resume" : "Pause"}
              </GlassButton>

              {state.isRunning && (
                <GlassButton variant="ghost" size="sm" onClick={handleReset}>
                  Reset
                </GlassButton>
              )}
            </div>

            {/* Keyboard hint */}
            <p className="text-center text-[10px] text-zinc-400 font-light">
              Press{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-500 text-[10px]">
                Space
              </kbd>{" "}
              to {isActive ? "pause" : "start"} ·{" "}
              <span
                className="cursor-pointer hover:text-zinc-600 transition-colors"
                onClick={() => setCollapsed(true)}
              >
                minimize
              </span>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
