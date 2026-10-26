"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FOCUS_DURATION, BREAK_DURATION } from "@/lib/constants";
import type { FocusStats, PomodoroState } from "@/types";

const STORAGE_KEY = "focus-room-stats";
const CUSTOM_KEY = "focus-room-custom-times";

interface CustomTimes {
  focusMinutes: number;
  breakMinutes: number;
}

function loadStats(): FocusStats {
  if (typeof window === "undefined") {
    return { todayMinutes: 0, thisWeekMinutes: 0, totalMinutes: 0, completedPomodoros: 0, lastDate: "" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { todayMinutes: 0, thisWeekMinutes: 0, totalMinutes: 0, completedPomodoros: 0, lastDate: "" };
}

function saveStats(stats: FocusStats): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch { /* ignore */ }
}

function loadCustomTimes(): CustomTimes {
  if (typeof window === "undefined") return { focusMinutes: FOCUS_DURATION / 60, breakMinutes: BREAK_DURATION / 60 };
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { focusMinutes: FOCUS_DURATION / 60, breakMinutes: BREAK_DURATION / 60 };
}

function saveCustomTimes(times: CustomTimes): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(times)); } catch { /* ignore */ }
}

export function usePomodoro() {
  const [customTimes, setCustomTimes] = useState<CustomTimes>({
    focusMinutes: FOCUS_DURATION / 60,
    breakMinutes: BREAK_DURATION / 60,
  });

  const [state, setState] = useState<PomodoroState>({
    isRunning: false,
    isPaused: false,
    mode: "focus",
    totalSeconds: FOCUS_DURATION,
    remainingSeconds: FOCUS_DURATION,
    completedPomodoros: 0,
  });

  const [stats, setStats] = useState<FocusStats>({
    todayMinutes: 0,
    thisWeekMinutes: 0,
    totalMinutes: 0,
    completedPomodoros: 0,
    lastDate: "",
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted state after mount to avoid SSR hydration mismatch
  useEffect(() => {
    setCustomTimes(loadCustomTimes());
    setStats(loadStats());
  }, []);

  const getFocusSeconds = () => customTimes.focusMinutes * 60;
  const getBreakSeconds = () => customTimes.breakMinutes * 60;

  // Update durations when custom times change (only if not running)
  const updateDurations = useCallback((newTimes: CustomTimes) => {
    setCustomTimes(newTimes);
    saveCustomTimes(newTimes);
    setState(prev => {
      if (!prev.isRunning) {
        const seconds = prev.mode === "focus" ? newTimes.focusMinutes * 60 : newTimes.breakMinutes * 60;
        return { ...prev, totalSeconds: seconds, remainingSeconds: seconds };
      }
      return prev;
    });
  }, []);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Tick every second when running
  useEffect(() => {
    if (state.isRunning && !state.isPaused) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.remainingSeconds <= 1) {
            const isFocus = prev.mode === "focus";
            const nextMode = isFocus ? "break" : "focus";
            const nextDuration = nextMode === "focus" ? getFocusSeconds() : getBreakSeconds();

            // Update stats if focus session completed
            if (isFocus) {
              setStats((s) => {
                const today = new Date().toISOString().split("T")[0];
                const newStats: FocusStats = {
                  todayMinutes: s.lastDate === today ? s.todayMinutes + customTimes.focusMinutes : customTimes.focusMinutes,
                  thisWeekMinutes: s.thisWeekMinutes + customTimes.focusMinutes,
                  totalMinutes: s.totalMinutes + customTimes.focusMinutes,
                  completedPomodoros: s.completedPomodoros + 1,
                  lastDate: today,
                };
                saveStats(newStats);
                return newStats;
              });
            }

            return {
              ...prev,
              isRunning: true,
              isPaused: false,
              mode: nextMode,
              totalSeconds: nextDuration,
              remainingSeconds: nextDuration,
              completedPomodoros: isFocus ? prev.completedPomodoros + 1 : prev.completedPomodoros,
            };
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning, state.isPaused, state.mode, customTimes]);

  const start = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
      isPaused: false,
    }));
  }, []);

  const pause = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPaused: true,
    }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => {
      const seconds = prev.mode === "focus" ? getFocusSeconds() : getBreakSeconds();
      return {
        ...prev,
        isRunning: false,
        isPaused: false,
        remainingSeconds: seconds,
        totalSeconds: seconds,
      };
    });
  }, [customTimes]);

  const toggle = useCallback(() => {
    setState((prev) => {
      if (!prev.isRunning) return { ...prev, isRunning: true, isPaused: false };
      return { ...prev, isPaused: !prev.isPaused };
    });
  }, []);

  const switchMode = useCallback((mode: "focus" | "break") => {
    const duration = mode === "focus" ? getFocusSeconds() : getBreakSeconds();
    setState({
      isRunning: false,
      isPaused: false,
      mode,
      totalSeconds: duration,
      remainingSeconds: duration,
      completedPomodoros: 0,
    });
  }, [customTimes]);

  return { state, stats, start, pause, reset, toggle, switchMode, customTimes, updateDurations };
}
