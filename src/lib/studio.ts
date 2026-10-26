import { z } from "zod";
import sources from "./studio-sources.json";

export const STUDIO_SOURCES = sources;
export const WINDOWS = [1, 2, 6, 12, 24] as const;
export function studioSearch(input: Record<string, unknown>) {
  const hours = Number(input['hours']);
  const selected = typeof input['sources'] === "string" ? input['sources'].split("|").filter((s) => sources.includes(s)) : sources;
  return { hours: WINDOWS.some((v) => v === hours) ? hours : 6, sources: selected.join("|") };
}
const sourceSchema = z.object({ source: z.string(), link: z.string().optional() });
export const studioNewsSchema = z.object({
  group_id: z.union([z.string(), z.number()]).transform(String),
  title_hu: z.string(), lead_hu: z.string().default(""), image: z.string().nullable().optional(),
  published_at: z.number().nullable().optional(), sources: z.array(sourceSchema).default([]),
  source: z.string().optional(), sources_count: z.number().optional(), is_synthesized: z.boolean().optional(),
});
export const dashboardSchema = z.object({
  time_window_hours: z.number(), selected_sources: z.array(z.string()), selected_sources_count: z.number().optional(),
  stats: z.object({ multi_source_count: z.number(), single_source_count: z.number() }),
  multi_source_news: z.array(studioNewsSchema), single_source_news: z.array(studioNewsSchema),
});
export type StudioNews = z.infer<typeof studioNewsSchema>;
export function hasSelection(ids: string[]) { return ids.length > 0; }
export function prepareSearch(input: Record<string, unknown>) {
  return { ids: typeof input['ids'] === "string" ? [...new Set(input['ids'].split("|").filter(Boolean))].slice(0, 100).join("|") : "" };
}
export function studioHead(title: string, description: string) {
  return { meta: [{ title: `${title} – STIRIX Studio` }, { name: "description", content: description },
    { property: "og:title", content: `${title} – STIRIX Studio` }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] };
}