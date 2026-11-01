import { useEffect } from "react";

/**
 * useKeyboardShortcuts — Declarative keyboard shortcut handler
 * Usage: useKeyboardShortcuts({ n: () => navigate("/app/orders/create") })
 */
export default function useKeyboardShortcuts(shortcuts = {}) {
  useEffect(() => {
    const handle = (e) => {
      // Ignore if typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      const fn = shortcuts[e.key];
      if (fn) fn(e);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [shortcuts]);
}
