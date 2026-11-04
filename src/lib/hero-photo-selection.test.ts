import { describe, expect, it } from "vitest";
import { selectArticlePhoto } from "./hero-photo-selection";

describe("article photo selection", () => {
  it("keeps the same image for an article across refreshes", () => {
    expect(selectArticlePhoto(["a", "b", "c"], "story-1")).toBe("c");
  });
  it("uses multiple images for different articles", () => {
    expect(new Set(["story-1", "story-2", "story-3"].map(id => selectArticlePhoto(["a", "b", "c"], id))).size).toBe(3);
  });
  it("handles missing images", () => {
    expect(selectArticlePhoto([], "story-1")).toBeUndefined();
  });
});