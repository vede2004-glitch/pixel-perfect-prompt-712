import { createServerFn } from "@tanstack/react-start";
import { applyLiveNews, bundledNewsMeta, news, normalizeNewsList } from "@/lib/news";
import { loadLiveNewsRaw } from "@/lib/news-source.server";

// A szerveren elfogadott legfrissebb nyers lista (JSON szövegként), hogy a
// böngésző pontosan ugyanazt kapja, amit a szerver kirajzolt.
let acceptedJson: string | null = null;

/**
 * Frissebb hír-adatok a beégetettnél: a szerver átveszi őket a saját listáiba,
 * és visszaadja JSON szövegként. Ha a beégetett adat a friss, null.
 */
export const getLiveNews = createServerFn({ method: "GET" }).handler(async (): Promise<string | null> => {
  const raw = await loadLiveNewsRaw();
  if (raw && applyLiveNews(normalizeNewsList(raw))) acceptedJson = JSON.stringify(raw);
  const latest = news.reduce((m, n) => Math.max(m, n.published_at ?? 0), 0);
  const newer = latest > bundledNewsMeta.latest || news.length > bundledNewsMeta.count;
  return newer ? acceptedJson : null;
});
