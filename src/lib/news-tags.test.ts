import { afterEach, describe, expect, it } from "vitest";
import { news, newsByTag, normalizeNewsList, tagLabel } from "./news";

const original = [...news];
const raw = {
  group_id: "group_tag_example",
  category: "Gazdaság",
  image: null,
  is_synthesized: true,
  published_at: 100,
  sources: [],
  title_hu: "Témás hír",
};

afterEach(() => news.splice(0, news.length, ...original));

describe("news topic tags", () => {
  it("normalizes and deduplicates supplied tags", () => {
    const [item] = normalizeNewsList([
      { ...raw, tags: [" Orbán Viktor ", "EU-csúcs", "orban-viktor", "", 42] },
    ]);
    expect(item?.tags).toEqual(["orban-viktor", "eu-csucs"]);
  });

  it("falls back to the slugified category when tags are missing", () => {
    const [item] = normalizeNewsList([raw]);
    expect(item?.tags).toEqual(["gazdasag"]);
  });

  it("falls back to the slugified category when tags are empty", () => {
    const [item] = normalizeNewsList([{ ...raw, tags: [] }]);
    expect(item?.tags).toEqual(["gazdasag"]);
  });

  it("matches tags case-insensitively and ignores surrounding whitespace", () => {
    news.splice(0, news.length, ...normalizeNewsList([{ ...raw, tags: ["orban-viktor"] }]));
    expect(newsByTag("  ORBÁN VIKTOR  ").map((item) => item.group_id)).toEqual([raw.group_id]);
  });

  it("returns matching articles newest first", () => {
    news.splice(
      0,
      news.length,
      ...normalizeNewsList([
        { ...raw, group_id: "older", published_at: 100, tags: ["kolozsvar"] },
        { ...raw, group_id: "newer", published_at: 200, tags: ["kolozsvar"] },
      ]),
    );
    expect(newsByTag("kolozsvar").map((item) => item.group_id)).toEqual(["newer", "older"]);
  });

  it("formats the requested example as a readable topic title", () => {
    expect(tagLabel("orban-viktor")).toBe("Orbán Viktor");
  });
});
