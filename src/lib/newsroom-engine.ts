import { dashboardSchema } from "./studio";
import type { StudioNews } from "./studio";

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown) => typeof value === "string" ? value : "";

/** Same filtering contract as stirix_newsroom_engine.py; input order gives central news precedence. */
export function filterNewsroomNews(entries: unknown[], selectedSources: string[], hours: number, now = Math.floor(Date.now() / 1000)) {
  const selected = new Set(selectedSources);
  const seen = new Set<string>();
  const multi: StudioNews[] = [], single: StudioNews[] = [];
  for (const entry of entries) {
    const item = record(entry);
    if (!item) continue;
    const published = item['published_at'] ?? item['fetched_at'] ?? 0;
    if (typeof published !== "number" || !Number.isFinite(published) || published < now - hours * 3600 || published > now) continue;
    const sourceRows = Array.isArray(item['sources']) ? item['sources'] : [];
    const allSources = sourceRows.flatMap((raw) => {
      const row = record(raw);
      const source = text(row?.['source']);
      return source ? [{ source, link: text(row?.['link']) }] : [];
    });
    if (!allSources.length && text(item['source'])) allSources.push({ source: text(item['source']), link: text(item['link']) });
    // Strictly narrow the group to the user's selected sources; the filtered count decides the column.
    const sources = allSources.filter((s) => selected.has(s.source));
    if (!sources.length) continue;
    const id = item['group_id'] ?? item['link'];
    if ((typeof id !== "string" && typeof id !== "number") || String(id) === "" || seen.has(String(id))) continue;
    seen.add(String(id));
    const multiple = sources.length > 1;
    const news: StudioNews = {
      group_id: String(id), title_hu: text(item['title_hu'] ?? item['title']),
      lead_hu: text(item['lead_hu'] ?? item['summary']),
      image: text(item['image']) || null, published_at: published, sources,
      source: sources[0]?.source, sources_count: sources.length, is_synthesized: item['is_synthesized'] === true,
    };
    (multiple ? multi : single).push(news);
  }
  const newestFirst = (a: StudioNews, b: StudioNews) => (b.published_at ?? 0) - (a.published_at ?? 0);
  return dashboardSchema.parse({ time_window_hours: hours, selected_sources: [...selected], selected_sources_count: selected.size,
    stats: { multi_source_count: multi.length, single_source_count: single.length },
    multi_source_news: multi.sort(newestFirst), single_source_news: single.sort(newestFirst) });
}