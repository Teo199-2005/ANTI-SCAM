"use client";

import { type RefObject, useEffect } from "react";

const FOCUSABLE_SEL =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusablesIn(root: Element): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SEL)).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      (el.offsetParent !== null || root.contains(document.activeElement) || el === document.activeElement),
  );
}

/**
 * Trap Tab focus inside `rootRef` while `active`. Restores focus to previously focused element on deactivate.
 */
export function useFocusTrap(active: boolean, rootRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!active || !rootRef.current) return;
    const root = rootRef.current;
    const previous = document.activeElement as HTMLElement | null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusablesIn(root);
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (current === first || !root.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else if (current === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    const id = window.requestAnimationFrame(() => {
      const els = focusablesIn(root);
      els[0]?.focus();
    });

    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [active, rootRef]);
}
