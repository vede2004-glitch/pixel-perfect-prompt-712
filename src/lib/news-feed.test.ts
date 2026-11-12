import { describe, expect, it } from "vitest";
import { normalizeNewsList } from "./news";
import { splitNewsFeed } from "./news-feed";

const ranked = normalizeNewsList([
  { group_id: "rank-3", title_hu: "Harmadik", sources: [], published_at: 900, is_synthesized: true, top_rank: 3 },
  { group_id: "rank-1", title_hu: "Első", sources: [], published_at: 100, is_synthesized: true, top_rank: 1 },
  { group_id: "rank-2", title_hu: "Második", sources: [], published_at: 500, is_synthesized: false, top_rank: 2 },
  { group_id: "plain-new", title_hu: "Friss rang nélkül", sources: [], published_at: 1200, is_synthesized: true, top_rank: null },
  { group_id: "plain-old", title_hu: "Régi rang nélkül", sources: [], published_at: 50, is_synthesized: false },
  { group_id: "rank-zero", title_hu: "Nullás rang", sources: [], published_at: 800, is_synthesized: true, top_rank: 0 },
]);

describe("news feed views", () => {
  it("Top shows only valid top_rank stories, strictly ascending", () => {
    expect(splitNewsFeed(ranked).top.map((n) => n.group_id)).toEqual(["rank-1", "rank-2", "rank-3"]);
  });

  it("Hero (top_rank 1) never repeats in the grid below", () => {
    const { top } = splitNewsFeed(ranked);
    const [hero, ...grid] = top;
    expect(hero.top_rank).toBe(1);
    expect(grid).not.toContain(hero);
    expect(new Set(top.map((n) => n.group_id)).size).toBe(top.length);
  });

  it("top_rank 0, null or missing values are excluded from Top", () => {
    const ids = splitNewsFeed(ranked).top.map((n) => n.group_id);
    expect(ids).not.toContain("rank-zero");
    expect(ids).not.toContain("plain-new");
    expect(ids).not.toContain("plain-old");
  });

  it("falls back to synthesized stories (newest first) when no top_rank exists", () => {
    const legacy = normalizeNewsList([
      { group_id: "ai-old", title_hu: "AI régi", sources: [], published_at: 100, is_synthesized: true },
      { group_id: "ai-new", title_hu: "AI friss", sources: [], published_at: 300, is_synthesized: true },
      { group_id: "single", title_hu: "Egyforrásos", sources: [], published_at: 200, is_synthesized: false },
    ]);
    expect(splitNewsFeed(legacy).top.map((n) => n.group_id)).toEqual(["ai-new", "ai-old"]);
  });

  it("Latest lists only synthesized stories, strictly newest first, ignoring top_rank", () => {
    expect(splitNewsFeed(ranked).latest.map((n) => n.group_id)).toEqual([
      "plain-new",
      "rank-3",
      "rank-zero",
      "rank-1",
    ]);
  });

  it("keeps single-source stories out of Latest even when they are newer", () => {
    const { latest } = splitNewsFeed(ranked);
    expect(latest.every((n) => n.is_synthesized)).toBe(true);
    expect(latest.map((n) => n.group_id)).not.toContain("rank-2");
  });

  it("Top and Latest never show the same list when ranks exist", () => {
    const { top, latest } = splitNewsFeed(ranked);
    expect(top.map((n) => n.group_id)).not.toEqual(latest.map((n) => n.group_id));
  });

  it("singles stream stays chronological and non-synthesized", () => {
    const { singles } = splitNewsFeed(ranked);
    expect(singles.map((n) => n.group_id)).toEqual(["rank-2", "plain-old"]);
  });

  it("does not mutate the input and handles empty feeds", () => {
    const before = ranked.map((n) => n.group_id);
    splitNewsFeed(ranked);
    expect(ranked.map((n) => n.group_id)).toEqual(before);
    expect(splitNewsFeed([])).toEqual({ top: [], latest: [], singles: [] });
  });
});
