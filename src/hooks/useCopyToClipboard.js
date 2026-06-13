/**
 * useCopyToClipboard
 *
 * A reusable, well-tested hook that centralises all clipboard write logic
 * across the Eventra codebase.
 *
 * Features:
 * - Uses the modern Clipboard API when available, falls back to
 *   execCommand('copy') for older browsers / WebViews
 * - Exposes a `copied` flag that auto-resets after a configurable timeout
 * - Exposes an `error` state for graceful degradation
 * - SSR-safe: never touches `navigator` at module evaluation time
 *
 * Usage:
 *   const { copy, copied, error } = useCopyToClipboard({ resetMs: 2000 });
 *   <button onClick={() => copy(window.location.href)}>
 *     {copied ? "Copied!" : "Copy Link"}
 *   </button>
 */

import { useState, useCallback, useRef } from "react";

/**
 * @param {Object} [options]
 * @param {number} [options.resetMs=2000]  - Milliseconds before `copied` resets to false
 * @returns {{
 *   copy:   (text: string) => Promise<boolean>,
 *   copied: boolean,
 *   error:  Error | null,
 * }}
 */
export default function useCopyToClipboard({ resetMs = 2000 } = {}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const copy = useCallback(
    async (text) => {
      if (typeof text !== "string") {
        const err = new TypeError(
          `useCopyToClipboard: expected a string, received ${typeof text}`
        );
        setError(err);
        return false;
      }

      // Clear any pending reset timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      setError(null);

      try {
        // Prefer modern async clipboard API
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard?.writeText
        ) {
          await navigator.clipboard.writeText(text);
        } else {
          // Legacy execCommand fallback (older Safari, WebViews)
          const el = document.createElement("textarea");
          el.value = text;
          el.setAttribute("readonly", "");
          // Position off-screen to avoid layout shifts
          el.style.cssText =
            "position:absolute;left:-9999px;top:-9999px;opacity:0";
          document.body.appendChild(el);
          el.select();
          el.setSelectionRange(0, text.length); // mobile browsers
          const success = document.execCommand("copy");
          document.body.removeChild(el);
          if (!success) {
            throw new Error("execCommand('copy') returned false");
          }
        }

        setCopied(true);
        timerRef.current = setTimeout(() => {
          setCopied(false);
          timerRef.current = null;
        }, resetMs);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setCopied(false);
        return false;
      }
    },
    [resetMs]
  );

  return { copy, copied, error };
}
