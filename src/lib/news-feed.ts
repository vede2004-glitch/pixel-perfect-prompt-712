import type { NewsItem } from "@/lib/news";

const newestFirst = (a: NewsItem, b: NewsItem) => (b.published_at ?? 0) - (a.published_at ?? 0);

/**
 * Hírfolyam-felbontás:
 * - top: csak a backend által kiosztott érvényes top_rank (1, 2, 3…) hírek,
 *   top_rank szerint növekvően; az első elem a Hero, sosem ismétlődik a rácsban.
 *   Tartalék: ha egyetlen hírnek sincs top_rank értéke (régi adatfájl),
 *   az AI-összefűzött hírek frissességi sorrendben lépnek a helyükbe.
 * - latest: csak az AI-összefűzött hírek, published_at szerint csökkenően
 *   (legfrissebb elöl); a top_rank/is_top_hero/is_top_list mezőket figyelmen
 *   kívül hagyja. Az egyforrásos hírek a Hírfolyam nézetbe tartoznak.
 * - singles: az egyforrásos hírek időrendi folyama (Hírfolyam nézet).
 */
export function splitNewsFeed(items: readonly NewsItem[]) {
  const ranked = items
    .filter((item) => typeof item.top_rank === "number" && item.top_rank > 0)
    .sort((a, b) => (a.top_rank ?? 0) - (b.top_rank ?? 0));
  const synthesized = items.filter((item) => item.is_synthesized).sort(newestFirst);
  const top = ranked.length ? ranked : synthesized;
  const latest = synthesized;
  const singles = items.filter((item) => !item.is_synthesized).sort(newestFirst);
  return { top, latest, singles };
}
