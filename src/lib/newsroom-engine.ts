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
    const sources = sourceRows.flatMap((raw) => {
      const row = record(raw);
      const source = text(row?.['source']);
      return source ? [{ source, link: text(row?.['link']) }] : [];
    });
    if (!sources.length && text(item['source'])) sources.push({ source: text(item['source']), link: text(item['link']) });
    if (!sources.some((s) => selected.has(s.source))) continue;
    const id = item['group_id'] ?? item['link'];
    if ((typeof id !== "string" && typeof id !== "number") || String(id) === "" || seen.has(String(id))) continue;
    seen.add(String(id));
    const multiple = sources.length > 1 || item['is_synthesized'] === true;
    const lead = text(item['lead_hu'] ?? item['summary']);
    const limit = multiple ? 220 : 180;
    const news: StudioNews = {
      group_id: String(id), title_hu: text(item['title_hu'] ?? item['title']),
      lead_hu: lead.length > limit ? `${lead.slice(0, limit)}…` : lead,
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