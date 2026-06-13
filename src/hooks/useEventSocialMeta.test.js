/**
 * useEventSocialMeta Tests
 */

import { renderHook } from "@testing-library/react";
import useEventSocialMeta from "../useEventSocialMeta";

const MOCK_EVENT = {
  title: "React Summit 2026",
  description: "The biggest React conference of the year.",
  image: "https://example.com/img.jpg",
  date: "2026-09-01T10:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
};

function getMeta(attr, value) {
  return document.querySelector(`meta[${attr}="${value}"]`);
}

describe("useEventSocialMeta", () => {
  beforeEach(() => {
    // Clean up any previously injected metas
    document.querySelectorAll("meta[property^='og:'], meta[name^='twitter:']").forEach((el) => el.remove());
    document.querySelectorAll("link[rel='canonical']").forEach((el) => el.remove());
  });

  it("injects og:title with event title and site name", () => {
    renderHook(() => useEventSocialMeta(MOCK_EVENT));
    const el = getMeta("property", "og:title");
    expect(el).not.toBeNull();
    expect(el.getAttribute("content")).toContain("React Summit 2026");
  });

  it("injects og:description with stripped markdown", () => {
    renderHook(() => useEventSocialMeta({
      ...MOCK_EVENT,
      description: "## Welcome\n\nThe **biggest** React conference.",
    }));
    const el = getMeta("property", "og:description");
    expect(el).not.toBeNull();
    expect(el.getAttribute("content")).not.toContain("#");
    expect(el.getAttribute("content")).not.toContain("**");
  });

  it("injects og:image with the event image URL", () => {
    renderHook(() => useEventSocialMeta(MOCK_EVENT));
    const el = getMeta("property", "og:image");
    expect(el?.getAttribute("content")).toBe(MOCK_EVENT.image);
  });

  it("injects twitter:card as summary_large_image", () => {
    renderHook(() => useEventSocialMeta(MOCK_EVENT));
    const el = getMeta("name", "twitter:card");
    expect(el?.getAttribute("content")).toBe("summary_large_image");
  });

  it("does not throw when event is null", () => {
    expect(() => {
      renderHook(() => useEventSocialMeta(null));
    }).not.toThrow();
  });

  it("truncates long descriptions to 160 characters", () => {
    const longDesc = "A".repeat(300);
    renderHook(() => useEventSocialMeta({ ...MOCK_EVENT, description: longDesc }));
    const el = getMeta("property", "og:description");
    expect(el?.getAttribute("content").length).toBeLessThanOrEqual(161); // 160 + ellipsis
  });
});
