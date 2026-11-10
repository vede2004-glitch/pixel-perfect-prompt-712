import { afterEach, describe, expect, it } from "vitest";
import { articlePath, getNews, news, normalizeNewsList } from "./news";
import { articleSchema } from "./article-schema";

const original = [...news];
const raw = {
  group_id: "group_legacy_example",
  slug: "magyar-hir-olvashato-cimmel",
  title_hu: "Magyar hír olvasható címmel",
  title_ro: "Știre cu un titlu clar",
  lead_hu: "Magyar összefoglaló",
  lead_ro: "Rezumat românesc",
  image: null,
  is_synthesized: true,
  sources: [],
};

afterEach(() => news.splice(0, news.length, ...original));

describe("article slug routing", () => {
  it("uses the supplied slug for newly generated links", () => {
    const [item] = normalizeNewsList([raw]);
    if (!item) throw new Error("Missing fixture");
    expect(item.slug).toBe("magyar-hir-olvashato-cimmel");
    expect(articlePath(item)).toBe("magyar-hir-olvashato-cimmel");
  });
  it("matches slugs before conflicting group IDs", () => {
    news.splice(0, news.length, ...normalizeNewsList([
      { ...raw, group_id: raw.slug, slug: "another-story" }, raw,
    ]));
    expect(getNews(raw.slug)?.group_id).toBe("group_legacy_example");
  });
  it("continues to resolve legacy group ID URLs", () => {
    news.splice(0, news.length, ...normalizeNewsList([raw]));
    expect(getNews("group_legacy_example")?.slug).toBe(raw.slug);
    expect(getNews("missing-article")).toBeUndefined();
  });
  it("keeps an ID link when an old article has no slug", () => {
    const [item] = normalizeNewsList([{ ...raw, slug: null }]);
    if (!item) throw new Error("Missing fixture");
    expect(articlePath(item)).toBe("group_legacy_example");
  });
  it("uses the active language for crawler-visible article content", () => {
    const [item] = normalizeNewsList([raw]);
    if (!item) throw new Error("Missing fixture");
    const hu = articleSchema(item, null, "hu");
    const ro = articleSchema(item, null, "ro");
    expect(hu.headline).toBe("Magyar hír olvasható címmel");
    expect(ro.headline).toBe("Știre cu un titlu clar");
    expect(ro.description).toBe("Rezumat românesc");
    expect(ro.inLanguage).toBe("ro");
    expect(ro.url).toBe("https://stirix.ro/hir/magyar-hir-olvashato-cimmel");
  });
});