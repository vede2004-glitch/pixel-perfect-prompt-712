import { useSyncExternalStore } from "react";
import { applyLiveNews, bundledNewsMeta, getNewsVersion, normalizeNewsList, subscribeNews } from "@/lib/news";

// A böngészőgyorsítótár kizárása: minden kérés egyedi időbélyeggel indul, és
// `cache: "no-store"`-ral érkezik, így a háttérszkript frissítése azonnal látszik.
const NO_STORE: RequestInit = { cache: "no-store", credentials: "same-origin" };
const bust = (url: string) => `${url}${url.includes("?") ? "&" : "?"}t=${new Date().getTime()}`;

let started = false;

/** A komponensek ezzel újrarajzolnak, ha élő hír-adatok érkeztek. */
export function useNewsVersion() {
  return useSyncExternalStore(subscribeNews, getNewsVersion, getNewsVersion);
}

/**
 * Kiszolgált hír-adatok ellenőrzése. Ha a szerveren újabb news.json van, mint
 * amit a böngésző betöltött, a lista a legfrissebbre vált – oldal újratöltése nélkül.
 */
export async function refreshNews(): Promise<boolean> {
  if (started || typeof window === "undefined") return false;
  started = true;
  try {
    // 1. Csak a méret: pár bájt, minden oldalletöltéskor ellenőrizhető.
    const metaRes = await fetch(bust("/api/public/news?meta=1"), NO_STORE);
    if (!metaRes.ok) return false;
    const meta = (await metaRes.json()) as Partial<{ count: number; latest: number }>;
    if ((meta.latest ?? 0) <= bundledNewsMeta.latest && (meta.count ?? 0) <= bundledNewsMeta.count) return false;

    // 2. A böngésző régi kiadást fut: átvesszük a kiszolgált, friss tartalmat.
    const res = await fetch(bust("/api/public/news"), NO_STORE);
    if (!res.ok) return false;
    return applyLiveNews(normalizeNewsList(await res.json()));
  } catch {
    return false;
  }
}
