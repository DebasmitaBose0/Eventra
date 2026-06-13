/**
 * useCopyToClipboard tests
 *
 * Covers:
 * - Successful copy via modern Clipboard API
 * - Legacy execCommand fallback
 * - Auto-reset of copied flag
 * - Error state when copy fails
 * - TypeError for non-string input
 */

import { renderHook, act } from "@testing-library/react";
import useCopyToClipboard from "../useCopyToClipboard";

// ---------------------------------------------------------------------------
// Setup mocks
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.useFakeTimers();

  // Mock navigator.clipboard
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useCopyToClipboard", () => {
  it("returns copied=false and error=null initially", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets copied=true after a successful copy", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      const ok = await result.current.copy("hello world");
      expect(ok).toBe(true);
    });

    expect(result.current.copied).toBe(true);
    expect(result.current.error).toBeNull();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hello world");
  });

  it("resets copied to false after resetMs milliseconds", async () => {
    const { result } = renderHook(() => useCopyToClipboard({ resetMs: 1500 }));

    await act(async () => {
      await result.current.copy("test");
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(result.current.copied).toBe(false);
  });

  it("sets error and returns false when Clipboard API rejects", async () => {
    navigator.clipboard.writeText = jest
      .fn()
      .mockRejectedValue(new Error("Permission denied"));

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      const ok = await result.current.copy("fail me");
      expect(ok).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error.message).toMatch(/Permission denied/i);
    expect(result.current.copied).toBe(false);
  });

  it("sets TypeError when a non-string is passed", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      const ok = await result.current.copy(42);
      expect(ok).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(TypeError);
    expect(result.current.copied).toBe(false);
  });

  it("falls back to execCommand when navigator.clipboard is unavailable", async () => {
    // Remove clipboard API
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });

    const execCommandSpy = jest
      .spyOn(document, "execCommand")
      .mockReturnValue(true);

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      const ok = await result.current.copy("fallback text");
      expect(ok).toBe(true);
    });

    expect(execCommandSpy).toHaveBeenCalledWith("copy");
    expect(result.current.copied).toBe(true);
  });
});
