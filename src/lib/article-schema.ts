import type { NewsItem } from "@/lib/news";
import { articlePath, tr } from "@/lib/news";
import type { Lang } from "@/lib/lang";
import { originFor } from "@/lib/domains";

export const SITE_URL = "https://hirx.ro";

const plain = (text: string) => text.replace(/\*\*(.+?)\*\*/g, "$1");

export function articleSchema(item: NewsItem, image: string | null, lang: Lang = "hu") {
  const origin = originFor(lang);
  const url = `${origin}/hir/${encodeURIComponent(articlePath(item))}`;
  const text = tr(item, lang);
  const published = item.published_at ? new Date(item.published_at * 1000) : null;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${url}#article`,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: plain(text.title),
    description: plain(text.lead),
    articleBody: plain(text.content),
    articleSection: item.category,
    inLanguage: lang,
    ...(published && Number.isFinite(published.getTime()) ? { datePublished: published.toISOString() } : {}),
    ...(image?.startsWith("https://") ? { image: [image] } : {}),
    publisher: { "@type": "Organization", name: lang === "ro" ? "Stirix.ro" : "Hirx.ro", url: origin },
    citation: item.sources.filter((source) => /^https?:\/\//.test(source.link)).map((source) => ({
      "@type": "CreativeWork",
      name: source.title,
      url: source.link,
      publisher: { "@type": "Organization", name: source.source },
    })),
  };
}

export function breadcrumbSchema(item: NewsItem, lang: Lang = "hu") {
  const origin = originFor(lang);
  const url = `${origin}/hir/${encodeURIComponent(articlePath(item))}`;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: lang === "ro" ? "Pagina principală" : "Főoldal", item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: lang === "ro" ? "Toate știrile" : "Összes hír", item: `${origin}/osszes` },
      { "@type": "ListItem", position: 3, name: plain(tr(item, lang).title), item: url },
    ],
  };
}

/** Escape HTML delimiters so article text cannot terminate the metadata script. */
export function serializeArticleSchema(schema: Record<string, unknown>) {
  return JSON.stringify(schema).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}