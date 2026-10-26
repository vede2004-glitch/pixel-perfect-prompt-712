import raw from "@/data/news.json";
import archiveRaw from "@/data/archive.json";
import historyRaw from "@/data/news_archive.json";
import historyRaw2 from "@/data/news_archive_2.json";
import type { Lang } from "@/lib/lang";
import { localTz } from "@/lib/lang";

export type NewsSource = { source: string; title: string; link: string };
export type LangContent = { title: string; lead: string; content: string };

type RawItem = {
  group_id: string;
  category?: string | null;
  image: string | null;
  is_synthesized: boolean;
  sources_count?: number | undefined;
  sources: NewsSource[];
  published_at?: number | null;
  // Lapos magyar mezők
  title_hu?: string;
  lead_hu?: string;
  content_hu?: string;
  // Lapos román mezők
  title_ro?: string;
  lead_ro?: string;
  content_ro?: string;
};

export type NewsItem = Omit<RawItem, "title_hu" | "lead_hu" | "content_hu" | "title_ro" | "lead_ro" | "content_ro" | "category"> & {
  // Magyar alapértelmezések (kereséshez, AI-hoz, SEO-hoz)
  title: string;
  lead: string;
  content: string;
  category: string;
  i18n: Record<Lang, LangContent>;
};

export const CATEGORIES = ["Általános", "Politika", "Gazdaság", "Erdély", "Sport", "Kultúra", "Bulvár"] as const;
export const ALL = "Összes hír";

const normCategory = (c?: string | null) => {
  // A korábbi "Közélet" kategória az "Erdély" fül alá vonult
  const key = (c ?? "").trim() === "Közélet" ? "Erdély" : (c ?? "").trim();
  const hit = CATEGORIES.find((k) => k.toLocaleLowerCase("hu") === key.toLocaleLowerCase("hu"));
  return hit ?? "Általános";
};

const clean = (s?: string) => (s ?? "").replace(/\.{3,}$/, "…");

// Ha nincs published_at, a group_id-ben lévő unix időbélyeget használjuk (group_<ts>_<n>)
const tsFromId = (id: string) => {
  const m = /_(\d{9,11})_/.exec(id);
  return m ? Number(m[1]) : null;
};

function normalize(r: RawItem): NewsItem {
  const huContent: LangContent = {
    title: r.title_hu ?? "",
    lead: clean(r.lead_hu),
    content: r.content_hu ?? "",
  };

  const roContent: LangContent = {
    title: r.title_ro ?? r.title_hu ?? "",
    lead: clean(r.lead_ro || r.lead_hu),
    content: r.content_ro ?? r.content_hu ?? "",
  };

  const i18n: Record<Lang, LangContent> = {
    hu: huContent,
    ro: roContent,
  };

  return {
    group_id: r.group_id,
    image: r.image,
    is_synthesized: r.is_synthesized,
    sources_count: r.sources_count,
    sources: r.sources || [],
    published_at: r.published_at ?? tsFromId(r.group_id),
    title: huContent.title,
    lead: huContent.lead,
    content: huContent.content,
    category: normCategory(r.category),
    i18n,
  };
}

/** Kiválasztott nyelv, hiányzó mezőnként magyar fallback. */
export function tr(n: NewsItem, lang: Lang): LangContent {
  const hu = n.i18n.hu;
  const l = n.i18n[lang];
  if (!l) return hu;
  return {
    title: l.title.trim() || hu.title,
    lead: l.lead.trim() || hu.lead,
    content: l.content.trim() || hu.content,
  };
}

/** Nyers news.json → NewsItem lista. Az élő frissítés is ezzel dolgozik. */
export function normalizeNewsList(input: unknown): NewsItem[] {
  if (!Array.isArray(input)) return [];
  return (input as RawItem[]).filter((r) => r && typeof r.group_id === "string").map(normalize);
}

export const news = normalizeNewsList(raw);

// A) csoportosított, AI által összefűzött hírek (2+ forrás)
export const synthesized = news.filter((n) => n.is_synthesized);

// Magyar nyelvű források – a HU nézet élő sávjába csak ezek kerülhetnek
export const HUNGARIAN_SOURCES = [
  "Maszol",
  "Transtelex",
  "Hargita Népe",
  "Szatmári Friss",
  "Manna",
  "MTI",
  "Kolozsvári Rádió",
  "Szatmári Sport",
  "Krónika",
  "Romkat",
  "Vásárhely.ma",
  "Mediatica.ro"
];

export const isHungarianSource = (n: NewsItem) =>
  n.sources.some((s) => HUNGARIAN_SOURCES.some((h) => s.source.toLocaleLowerCase("hu").includes(h.toLocaleLowerCase("hu"))));

// B) egyedi, egyforrású hírek → élő idősáv
export const singles = news
  .filter((n) => !n.is_synthesized)
  .sort((a, b) => (b.published_at ?? 0) - (a.published_at ?? 0));


export function timeAgo(ts: number | null | undefined, lang: Lang = "hu") {
  if (!ts) return lang === "ro" ? "Recent" : "Friss";
  const min = Math.max(1, Math.round((Date.now() / 1000 - ts) / 60));
  if (min < 60) return lang === "ro" ? `acum ${min} min.` : `${min} perce`;
  const h = Math.round(min / 60);
  if (lang === "ro") return h < 24 ? `acum ${h} ore` : `acum ${Math.round(h / 24)} zile`;
  return h < 24 ? `${h} órája` : `${Math.round(h / 24)} napja`;
}

/** Pontos dátum + időpont, pl. „okt. 5. 14:20" */
export function formatDate(ts: number | null | undefined, lang: Lang = "hu") {
  if (!ts) return "";
  return new Date(ts * 1000).toLocaleString(lang === "ro" ? "ro-RO" : "hu-HU", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    ...(localTz ? {} : { timeZone: "Europe/Bucharest" }),
  });
}

export const RECENT_HOURS = 12;
/** Igaz, ha a hír az elmúlt 24 órában jelent meg (dátum nélküli hír frissnek számít).
 *  Szándékosan csak egy paramétert vesz: a `.filter(isRecent)` hívásnál a filter az elem
 *  indexét adná át második argumentumként, ami egy korábbi `now` paraméterrel felülírta
 *  volna a Date.now()-t, és minden hír átment volna a szűrőn. */
export const isRecent = (n: NewsItem) =>
  !n.published_at || Date.now() / 1000 - n.published_at <= RECENT_HOURS * 3600;

/** Archív cikkek (weboldalparolas.py → src/data/archive.json), group_id szerint összevonva. */
type ArchiveRaw = {
  group_id?: string; source?: string; title?: string; link?: string;
  image?: string | null; summary?: string; category?: string | null; fetched_at?: number;
};

/** Minden valaha elkészült kártya (cikk_szintetizalas.py → news_archive.json), a friss news.json felülírja. */
const buildHistory = (current: NewsItem[]) => {
  const currentIds = new Set(current.map((n) => n.group_id));
  return ([...(historyRaw as unknown as RawItem[]), ...(historyRaw2 as unknown as RawItem[])]).filter((r) => r.group_id && !currentIds.has(r.group_id)).map(normalize);
};

const buildArchive = (current: NewsItem[], hist: NewsItem[]) => {
  const knownIds = new Set([...current, ...hist].map((n) => n.group_id));
  const archiveGroups = new Map<string, ArchiveRaw[]>();
  for (const a of archiveRaw as unknown as ArchiveRaw[]) {
    const id = a.group_id || a.link;
    if (!id || knownIds.has(id)) continue;
    archiveGroups.set(id, [...(archiveGroups.get(id) ?? []), a]);
  }
  return [...archiveGroups.entries()].map(([id, arts]) => {
    const first = arts[0] ?? {};
    const c: LangContent = { title: first.title ?? "", lead: clean(first.summary?.slice(0, 220)), content: first.summary ?? "" };
    return {
      group_id: id,
      image: arts.find((x) => x.image)?.image ?? null,
      is_synthesized: false,
      sources: arts.map((x) => ({ source: x.source ?? "", title: x.title ?? "", link: x.link ?? "" })),
      published_at: Math.max(...arts.map((x) => x.fetched_at ?? 0)) || null,
      title: c.title, lead: c.lead, content: c.content,
      category: normCategory(first.category),
      i18n: { hu: c, ro: c },
    };
  });
};

export const history = buildHistory(news);
export const archive: NewsItem[] = buildArchive(news, history);

export const getNews = (id: string) => news.find((n) => n.group_id === id) ?? history.find((n) => n.group_id === id) ?? archive.find((n) => n.group_id === id);

/** Relevancia: több forrás + AI összefűzés előre, azon belül frissebb előre. Az archívumot is tartalmazza. */
const byRelevanceCmp = (a: NewsItem, b: NewsItem) =>
  (b.sources.length + (b.is_synthesized ? 1 : 0)) - (a.sources.length + (a.is_synthesized ? 1 : 0)) ||
  (b.published_at ?? 0) - (a.published_at ?? 0);

export const byRelevance = [...news, ...history, ...archive].sort(byRelevanceCmp);

// ---------------------------------------------------------------------------
// Élő frissítés: a böngésző a kiszolgált news.json tartalmát használja, ha az
// újabb, mint ami a betöltött Oldalba be van égetve. A listákat helyben cseréljük
// le, így a már nyitott oldalak újrarajzolódnak.
// ---------------------------------------------------------------------------
export type NewsMeta = { count: number; latest: number; synthesized: number };

const metaOf = (items: NewsItem[]): NewsMeta => ({
  count: items.length,
  latest: items.reduce((m, n) => Math.max(m, n.published_at ?? 0), 0),
  synthesized: items.filter((n) => n.is_synthesized).length,
});

/** A build időpontjában ismert hír-adatok – enélkül újabbat fogadunk el. */
export const bundledNewsMeta = metaOf(news);

let newsVersion = 0;
const newsListeners = new Set<() => void>();

/** Irányított újrarajzolás: a komponensek ezzel figyelik a hírlistákat. */
export const subscribeNews = (fn: () => void) => {
  newsListeners.add(fn);
  return () => {
    newsListeners.delete(fn);
  };
};
export const getNewsVersion = () => newsVersion;

/**
 * Friss hír-adatok beültetése a már exportált listákba.
 * Csak akkor fogadja el, ha a kapott lista valóban újabb, mint a beépített.
 */
export function applyLiveNews(items: NewsItem[]): boolean {
  if (!items.length) return false;
  const next = metaOf(items);
  const current = metaOf(news);
  if (next.latest <= current.latest && next.count <= current.count) return false;

  news.splice(0, news.length, ...items);
  synthesized.splice(0, synthesized.length, ...news.filter((n) => n.is_synthesized));
  singles.splice(0, singles.length, ...news.filter((n) => !n.is_synthesized).sort((a, b) => (b.published_at ?? 0) - (a.published_at ?? 0)));
  const hist = buildHistory(news);
  history.splice(0, history.length, ...hist);
  const arch = buildArchive(news, hist);
  archive.splice(0, archive.length, ...arch);
  byRelevance.splice(0, byRelevance.length, ...[...news, ...hist, ...arch].sort(byRelevanceCmp));

  newsVersion++;
  for (const fn of newsListeners) fn();
  return true;
}
