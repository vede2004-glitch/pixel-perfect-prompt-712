import type { NewsItem } from "@/lib/news";

/** Classify before display filters; Top and Latest contain the complete AI set. */
export function splitNewsFeed(items: readonly NewsItem[]) {
  const top = items.filter((item) => item.is_synthesized);
  const newestFirst = (a: NewsItem, b: NewsItem) => (b.published_at ?? 0) - (a.published_at ?? 0);
  const latest = [...top].sort(newestFirst);
  const singles = items.filter((item) => !item.is_synthesized).sort(newestFirst);
  return { top, latest, singles };
}
