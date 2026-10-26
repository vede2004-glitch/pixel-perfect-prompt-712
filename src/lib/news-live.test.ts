import { describe, expect, test } from "bun:test";
import { news, singles } from "@/lib/news";
import { hydrateLiveNews } from "@/lib/news-live";

describe("hydrateLiveNews", () => {
  test("a szervertől kapott újabb lista az első rajzolás előtt lecseréli a beégetettet", () => {
    const latest = news.reduce((m, n) => Math.max(m, n.published_at ?? 0), 0);
    const fresh = { group_id: "group_9999999999_1", image: null, is_synthesized: false, sources: [{ source: "Maszol", title: "x", link: "https://x" }], published_at: latest + 60, title_hu: "Friss hír" };
    hydrateLiveNews(JSON.stringify([fresh]));
    expect(news.map((n) => n.group_id)).toEqual(["group_9999999999_1"]);
    expect(singles[0]?.title).toBe("Friss hír");
  });

  test("régebbi lista nem írja felül az újabbat (nincs visszaugrás)", () => {
    hydrateLiveNews(JSON.stringify([{ group_id: "group_1000000000_1", image: null, is_synthesized: false, sources: [], published_at: 1000000000, title_hu: "Régi" }]));
    expect(news[0]?.title).toBe("Friss hír");
  });
});
