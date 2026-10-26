import { describe, expect, test } from "bun:test";
import { applyLiveNews, archive, byRelevance, bundledNewsMeta, getNewsVersion, history, news, normalizeNewsList, singles, synthesized } from "./news";

const FRESH_ID = "group_2000000000_1";
const freshRaw = [
  {
    group_id: FRESH_ID,
    category: "Politika",
    image: null,
    is_synthesized: true,
    published_at: 2000000000,
    sources: [{ source: "Maszol", title: "Cím", link: "https://maszol.ro/hir" }],
    title_hu: "Friss hír",
    lead_hu: "Bevezető",
    content_hu: "Törzs",
  },
];

describe("elo news.json frissites", () => {
  test("a szemét nem lista", () => {
    expect(normalizeNewsList("nem lista")).toEqual([]);
    expect(normalizeNewsList(null)).toEqual([]);
    expect(normalizeNewsList([{ no_id: 1 }])).toEqual([]);
  });

  test("a regi vagy ures lista nem valtja ki az elot", () => {
    expect(applyLiveNews([])).toBe(false);
    expect(applyLiveNews(normalizeNewsList([{ group_id: "group_100_1", title_hu: "Regi", sources: [], published_at: 100 }]))).toBe(false);
    expect(getNewsVersion()).toBe(0);
    expect(news.length).toBe(bundledNewsMeta.count);
  });

  test("az ujabb news.json kicsereli a listakat es jelez", () => {
    expect(applyLiveNews(normalizeNewsList(freshRaw))).toBe(true);
    expect(getNewsVersion()).toBe(1);
    expect(news.length).toBe(1);
    expect(news[0]?.group_id).toBe(FRESH_ID);
    expect(synthesized.map((n) => n.group_id)).toEqual([FRESH_ID]);
    expect(singles.length).toBe(0);
    expect(byRelevance.some((n) => n.group_id === FRESH_ID)).toBe(true);
    expect(history.some((n) => n.group_id === FRESH_ID)).toBe(false);
  });

  test("a mar bevett ujabb lista nem noveli tobbbsszor a verziot", () => {
    expect(applyLiveNews(normalizeNewsList(freshRaw))).toBe(false);
    expect(getNewsVersion()).toBe(1);
  });
});
