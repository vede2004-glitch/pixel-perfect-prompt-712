import { createFileRoute } from "@tanstack/react-router";
import raw from "@/data/news.json";
import { bundledNewsMeta, normalizeNewsList, type NewsItem } from "@/lib/news";

// A beégetett news.json csak tartalék: a GitHub Actions `[skip ci]` commitjai
// nem indítanak új buildet, ezért a friss adatot futásidőben a repóból olvassuk,
// a news.json utolsó commitjának pontos címéről (CDN-késés nélkül).
const NO_STORE = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
};

function metaOf(items: NewsItem[]) {
  return {
    count: items.length,
    latest: items.reduce((m, n) => Math.max(m, n.published_at ?? 0), 0),
    synthesized: items.filter((n) => n.is_synthesized).length,
  };
}

export const Route = createFileRoute("/api/public/news")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const { loadLiveNewsRaw } = await import("@/lib/news-source.server");
        const live = await loadLiveNewsRaw();
        const data = live ?? raw;
        if (url.searchParams.get("meta") === "1") {
          const meta = live ? metaOf(normalizeNewsList(live)) : bundledNewsMeta;
          return Response.json(meta, { headers: NO_STORE });
        }
        return new Response(JSON.stringify(data), { headers: NO_STORE });
      },
    },
  },
});
