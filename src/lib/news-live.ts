import { useSyncExternalStore } from "react";
import { applyLiveNews, getNewsVersion, news, normalizeNewsList, subscribeNews } from "@/lib/news";

// A böngészőgyorsítótár kizárása: minden kérés egyedi időbélyeggel indul, és
// `cache: "no-store"`-ral érkezik, így a háttérszkript frissítése azonnal látszik.
const NO_STORE: RequestInit = { cache: "no-store", credentials: "same-origin" };
const bust = (url: string) => `${url}${url.includes("?") ? "&" : "?"}t=${new Date().getTime()}`;

let started = false;
let running = false;
const POLL_MS = 3 * 60 * 1000;

/** A komponensek ezzel újrarajzolnak, ha élő hír-adatok érkeztek. */
export function useNewsVersion() {
  return useSyncExternalStore(subscribeNews, getNewsVersion, getNewsVersion);
}

let hydratedJson: string | null = null;
/**
 * A szerver által kirajzolt friss lista átvétele még az első rajzolás előtt,
 * hogy frissítéskor ne villanjon fel a beégetett, régebbi hírlista.
 */
export function hydrateLiveNews(json: string | null | undefined) {
  if (!json || json === hydratedJson) return;
  hydratedJson = json;
  try {
    applyLiveNews(normalizeNewsList(JSON.parse(json)));
  } catch {
    // Hibás adat: marad a beégetett lista.
  }
}

async function checkOnce(): Promise<boolean> {
  if (running) return false;
  running = true;
  try {
    const current = { latest: news.reduce((m, n) => Math.max(m, n.published_at ?? 0), 0), count: news.length };
    const metaRes = await fetch(bust("/api/public/news?meta=1"), NO_STORE);
    if (!metaRes.ok) return false;
    const meta = (await metaRes.json()) as Partial<{ count: number; latest: number }>;
    if ((meta.latest ?? 0) <= current.latest && (meta.count ?? 0) <= current.count) return false;
    const res = await fetch(bust("/api/public/news"), NO_STORE);
    if (!res.ok) return false;
    return applyLiveNews(normalizeNewsList(await res.json()));
  } catch {
    return false;
  } finally {
    running = false;
  }
}

/**
 * Kiszolgált hír-adatok ellenőrzése betöltéskor, majd 3 percenként és amikor a
 * lap újra előtérbe kerül – oldal újratöltése nélkül.
 */
export async function refreshNews(): Promise<boolean> {
  if (started || typeof window === "undefined") return false;
  started = true;
  window.setInterval(() => void checkOnce(), POLL_MS);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkOnce();
  });
  return checkOnce();
}
