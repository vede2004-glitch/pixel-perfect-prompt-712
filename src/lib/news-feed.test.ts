import { describe, expect, it } from "vitest";
import { normalizeNewsList } from "./news";
import { splitNewsFeed } from "./news-feed";

const items = normalizeNewsList(
  Array.from({ length: 12 }, (_, i) => ({
    group_id: `story-${i}`,
    title_hu: `Story ${i}`,
    sources: [],
    published_at: [100, 900, 200, 800, 300, 700, 400, 600, 1100, 1300, 1200, null][i],
    is_synthesized: i % 2 === 0,
  })),
);

describe("news feed views", () => {
  it("keeps every AI story in original order in Top, without a story limit", () => {
    expect(splitNewsFeed(items).top.map((n) => n.group_id)).toEqual([
      "story-0",
      "story-2",
      "story-4",
      "story-6",
      "story-8",
      "story-10",
    ]);
    const many = normalizeNewsList(
      Array.from({ length: 12 }, (_, i) => ({
        group_id: `ai-${i}`,
        title_hu: `AI ${i}`,
        sources: [],
        is_synthesized: true,
      })),
    );
    expect(splitNewsFeed(many).top).toHaveLength(12);
  });

  it("shows every AI story in Latest, strictly newest first", () => {
    expect(splitNewsFeed(items).latest.map((n) => n.group_id)).toEqual([
      "story-10",
      "story-8",
      "story-6",
      "story-4",
      "story-2",
      "story-0",
    ]);
  });

  it("includes the same complete AI set on Top and Latest", () => {
    const { top, latest } = splitNewsFeed(items);
    expect(latest.map((n) => n.group_id).sort()).toEqual(top.map((n) => n.group_id).sort());
  });

  it("puts only non-AI stories in the separate chronological stream", () => {
    expect(splitNewsFeed(items).singles.map((n) => n.group_id)).toEqual([
      "story-9",
      "story-1",
      "story-3",
      "story-5",
      "story-7",
      "story-11",
    ]);
  });

  it("does not mutate the input and handles short or empty feeds", () => {
    const before = items.map((n) => n.group_id);
    splitNewsFeed(items);
    expect(items.map((n) => n.group_id)).toEqual(before);
    expect(splitNewsFeed(items.slice(0, 3))).toEqual({
      top: [items[0], items[2]],
      latest: [items[2], items[0]],
      singles: [items[1]],
    });
    expect(splitNewsFeed([])).toEqual({ top: [], latest: [], singles: [] });
  });
});
