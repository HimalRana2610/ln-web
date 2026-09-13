import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useVisibleInterval } from "@/lib/use-visible-interval";

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event("visibilitychange"));
}

/** A quiz left open in a background tab must not keep hitting the backend. */
describe("useVisibleInterval", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setHidden(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    setHidden(false);
  });

  it("polls while visible, pauses while hidden, and catches up on return", () => {
    const callback = vi.fn();
    renderHook(() => useVisibleInterval(callback, 3000));

    act(() => vi.advanceTimersByTime(6000));
    expect(callback).toHaveBeenCalledTimes(2);

    act(() => setHidden(true));
    act(() => vi.advanceTimersByTime(30_000));
    expect(callback).toHaveBeenCalledTimes(2);

    // One immediate refresh on return, then the regular cadence resumes.
    act(() => setHidden(false));
    expect(callback).toHaveBeenCalledTimes(3);
    act(() => vi.advanceTimersByTime(3000));
    expect(callback).toHaveBeenCalledTimes(4);
  });

  it("stops when unmounted", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useVisibleInterval(callback, 1000));
    unmount();
    act(() => vi.advanceTimersByTime(5000));
    expect(callback).not.toHaveBeenCalled();
  });
});
