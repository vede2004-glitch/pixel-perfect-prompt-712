import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Hash } from "lucide-react";
import { useEffect, useMemo } from "react";
import { PageShell } from "@/components/PageShell";
import { RichText } from "@/components/RichText";
import { StoryLink } from "@/components/StoryLink";
import { TagChips } from "@/components/TagChips";
import { buttonVariants } from "@/components/ui/button";
import { originFor } from "@/lib/domains";
import { getDomainLang } from "@/lib/domain.functions";
import { getLang, useLang } from "@/lib/lang";
import { formatDate, newsByTag, tagLabel, tagSlug, tr } from "@/lib/news";
import { useNewsVersion } from "@/lib/news-live";
import { getLiveNews } from "@/lib/news-live.functions";

const categoryRo: Record<string, string> = {
  Általános: "General",
  Politika: "Politică",
  Gazdaság: "Economie",
  Erdély: "Transilvania",
  Sport: "Sport",
  Kultúra: "Cultură",
  Bulvár: "Monden",
};

export const Route = createFileRoute("/tag/$tagName")({
  loader: async ({ params }) => {
    if (typeof window === "undefined") await getLiveNews().catch(() => null);
    const tag = tagSlug(params.tagName);
    const lang = typeof window === "undefined" ? ((await getDomainLang()) ?? "hu") : getLang();
    return { tag, lang, count: newsByTag(tag).length };
  },
  head: ({ loaderData, params }) => {
    const tag = tagSlug(loaderData?.tag ?? params.tagName);
    const lang = loaderData?.lang ?? "hu";
    const ro = lang === "ro";
    const label = tagLabel(tag);
    const count = loaderData?.count ?? 0;
    const title = ro
      ? `${label} – Știri și noutăți | Stirix.ro`
      : `${label} – Hírek és fejlemények | Hirx.ro`;
    const description = ro
      ? `${count} articol în tema ${label}: știri din mai multe surse, în ordine cronologică.`
      : `${count} cikk a(z) ${label} témában: több forrásból származó hírek időrendben.`;
    const url = `${originFor(lang)}/tag/${encodeURIComponent(tag)}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
        ...(count ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: TagPage,
});

function TagPage() {
  const { tag, lang: loadedLang } = Route.useLoaderData();
  const lang = useLang();
  const ro = lang === "ro";
  const router = useRouter();
  const newsVersion = useNewsVersion();
  const items = useMemo(() => newsByTag(tag), [tag, newsVersion]);
  const label = tagLabel(tag);

  useEffect(() => {
    if (loadedLang !== lang) void router.invalidate();
  }, [loadedLang, lang, router]);

  return (
    <PageShell
      eyebrow={`#${tag}`}
      title={ro ? `Articole pe tema: „${label}”` : `Cikkek ebben a témában: „${label}”`}
      intro={ro ? `${items.length} articol găsit` : `${items.length} cikk található`}
    >
      {items.length ? (
        <ol className="mx-auto max-w-3xl divide-y divide-border rounded-lg border border-border bg-card">
          {items.map((item) => (
            <li key={item.group_id} className="p-5">
              <StoryLink item={item} className="group block">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  {item.is_synthesized && <span className="text-primary">✨ AI · </span>}
                  {ro ? (categoryRo[item.category] ?? item.category) : item.category} ·{" "}
                  {formatDate(item.published_at, lang)}
                </p>
                <h2 className="mt-2 font-display text-lg font-bold leading-snug transition-colors group-hover:text-primary">
                  <RichText text={tr(item, lang).title} />
                </h2>
                {tr(item, lang).lead && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    <RichText text={tr(item, lang).lead} />
                  </p>
                )}
              </StoryLink>
              <TagChips item={item} className="mt-3" />
            </li>
          ))}
        </ol>
      ) : (
        <div className="mx-auto max-w-xl rounded-lg border border-border bg-card px-6 py-12 text-center">
          <Hash className="mx-auto size-8 text-primary" aria-hidden />
          <h2 className="mt-4 font-display text-xl font-bold">
            {ro ? "Încă nu există articole pe această temă" : "Ebben a témában még nincs cikk"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {ro
              ? "Revenit la fluxul principal pentru cele mai recente știri."
              : "Térj vissza a fő hírfolyamhoz a legfrissebb hírekért."}
          </p>
          <Link to="/" className={buttonVariants({ className: "mt-6" })}>
            {ro ? "Înapoi la știri" : "Vissza a hírekhez"}
          </Link>
        </div>
      )}
    </PageShell>
  );
}
