export type SceneSlug = "rain-library" | "snow-cabin" | "ocean-morning" | "night-cafe";
export type SceneMode = "outdoor" | "indoor";

export interface Scene {
  slug: SceneSlug;
  title: string;
  description: string;
  keywords: string[];
  gradient: string;
  overlayOpacity: string;
  modes: {
    outdoor: string;
    indoor: string;
  };
}

export interface PomodoroState {
  isRunning: boolean;
  isPaused: boolean;
  mode: "focus" | "break";
  remainingSeconds: number;
  totalSeconds: number;
  completedPomodoros: number;
}

export interface FocusStats {
  todayMinutes: number;
  thisWeekMinutes: number;
  totalMinutes: number;
  completedPomodoros: number;
  lastDate: string;
}
