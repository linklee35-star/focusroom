"use client";

import { useEffect } from "react";

interface KeyMap {
  [key: string]: () => void;
}

export function useKeyboard(keyMap: KeyMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger when user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const handler = keyMap[e.key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyMap, enabled]);
}
