import { describe, expect, it } from "bun:test";
import { filterNewsroomNews } from "./newsroom-engine";

const now = 2_000_000_000;
const item = (id: string, ageHours: number, sources = ["Maszol"], synthesized = false) => ({ group_id: id, published_at: now - ageHours * 3600, sources: sources.map((source) => ({ source })), title_hu: id, is_synthesized: synthesized });
describe("Newsroom engine", () => {
  it("includes only selected sources and accepts a matching member of a pair", () => {
    const result = filterNewsroomNews([item("pair", 1, ["Maszol", "Transtelex"]), item("other", 1, ["Digi24"])], ["Transtelex"], 6, now);
    expect(result.multi_source_news.map((n) => n.group_id)).toEqual(["pair"]);
    expect(result.single_source_news).toEqual([]);
  });
  it("returns nothing for an empty source selection", () => expect(filterNewsroomNews([item("one", 1)], [], 6, now).stats).toEqual({ multi_source_count: 0, single_source_count: 0 }));
  it("includes the 6-hour boundary but excludes older and future news", () => expect(filterNewsroomNews([item("edge", 6), item("old", 6.01), item("future", -1)], ["Maszol"], 6, now).single_source_news.map((n) => n.group_id)).toEqual(["edge"]));
  it("separates multi-source and synthesized from single-source and sorts newest first", () => {
    const result = filterNewsroomNews([item("older", 5), item("pair", 2, ["Maszol", "Transtelex"]), item("ai", 1, ["Maszol"], true), item("newer", 1)], ["Maszol"], 6, now);
    expect(result.multi_source_news.map((n) => n.group_id)).toEqual(["ai", "pair"]);
    expect(result.single_source_news.map((n) => n.group_id)).toEqual(["newer", "older"]);
    expect(result.stats).toEqual({ multi_source_count: 2, single_source_count: 2 });
  });
  it("deduplicates memory/archive entries in favor of central news", () => expect(filterNewsroomNews([item("same", 2), { ...item("same", 1), title_hu: "memory" }], ["Maszol"], 6, now).single_source_news.map((n) => n.title_hu)).toEqual(["same"]));
  it("supports raw memory/archive fields and preserves source links", () => {
    const result = filterNewsroomNews([{ link: "https://maszol.ro/article", source: "Maszol", title: "Memory", summary: "Lead", fetched_at: now - 3600 }], ["Maszol"], 6, now);
    expect(result.single_source_news[0]?.sources).toEqual([{ source: "Maszol", link: "https://maszol.ro/article" }]);
    expect(result.single_source_news[0]?.title_hu).toBe("Memory");
  });
});