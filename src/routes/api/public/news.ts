import { createFileRoute } from "@tanstack/react-router";
import raw from "@/data/news.json";
import { bundledNewsMeta, normalizeNewsList, type NewsItem } from "@/lib/news";

// A beégetett news.json csak tartalék: a GitHub Actions `[skip ci]` commitjai
// nem indítanak új buildet, ezért a friss adatot futásidőben a repóból olvassuk
// (NEWS_JSON_URL, pl. https://raw.githubusercontent.com/<user>/<repo>/main/src/data/news.json).
const NO_STORE = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
};

const DEFAULT_NEWS_JSON_URL =
  "https://raw.githubusercontent.com/vede2004-glitch/pixel-perfect-prompt-712/main/src/data/news.json";

async function loadLive(): Promise<unknown | null> {
  const base = process.env["NEWS_JSON_URL"] || DEFAULT_NEWS_JSON_URL;
  try {
    const url = `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store", headers: { "cache-control": "no-cache" } });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length ? data : null;
  } catch {
    return null;
  }
}

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
        const live = await loadLive();
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
