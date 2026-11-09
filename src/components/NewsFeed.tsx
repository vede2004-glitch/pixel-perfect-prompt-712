import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Link, useLoaderData } from "@tanstack/react-router";
import { Clock3, Flame, Layers3, Library, Radio, Search, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { RichText } from "@/components/RichText";
import { SiteMenu } from "@/components/SiteMenu";
import { Button, buttonVariants } from "@/components/ui/button";
import { heroPhoto } from "@/lib/hero-photos";
import { LANGS, setLang, useLang, type Lang } from "@/lib/lang";
import { useNewsVersion } from "@/lib/news-live";
import { splitNewsFeed } from "@/lib/news-feed";
import {
  ALL,
  CATEGORIES,
  formatDate,
  isHungarianSource,
  news,
  normalizeNewsList,
  tr,
  type NewsItem,
} from "@/lib/news";
import { cn } from "@/lib/utils";

type FeedView = "top" | "latest" | "singles";

const categoryRo: Record<string, string> = {
  [ALL]: "Toate",
  Általános: "General",
  Politika: "Politică",
  Gazdaság: "Economie",
  Erdély: "Transilvania",
  Sport: "Sport",
  Kultúra: "Cultură",
  Bulvár: "Monden",
};

function Coverage({ item, lang }: { item: NewsItem; lang: Lang }) {
  if (item.sources.length <= 1) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
      <Layers3 className="size-3" />
      {item.sources.length} {lang === "ro" ? "surse" : "forrás"}
    </span>
  );
}

function StoryLink({
  item,
  className,
  children,
}: {
  item: NewsItem;
  className: string;
  children: ReactNode;
}) {
  const source = item.sources[0];
  return !item.is_synthesized && source?.link ? (
    <a href={source.link} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link to="/hir/$id" params={{ id: item.group_id }} className={className}>
      {children}
    </Link>
  );
}

const subscribeHydration = () => () => {};
const clientHydration = () => true;
const serverHydration = () => false;

export function NewsFeed({ view }: { view: FeedView }) {
  const version = useNewsVersion();
  const { liveNews } = useLoaderData({ from: "__root__" });
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydration, serverHydration);
  const lang = useLang();
  const ro = lang === "ro";
  const [query, setQuery] = useState("");
  const [mobileSearch, setMobileSearch] = useState(false);
  const [category, setCategory] = useState<string>(ALL);
  const [limit, setLimit] = useState(60);

  const feed = useMemo(() => {
    // The external news store is mutable; its version triggers this memo after live updates.
    void version;
    // The first browser render uses the exact request snapshot, avoiding a stale-news flash.
    if (!hydrated && liveNews) {
      try {
        return splitNewsFeed(normalizeNewsList(JSON.parse(liveNews)));
      } catch {
        // Bundled fallback remains available if the live payload is malformed.
      }
    }
    return splitNewsFeed(news);
  }, [version, hydrated, liveNews]);

  const translated = (item: NewsItem) => tr(item, lang);
  const labelCategory = (value: string) => (ro ? (categoryRo[value] ?? value) : value);
  const matchesLanguage = (item: NewsItem) =>
    ro ? !isHungarianSource(item) : isHungarianSource(item);
  const matches = (item: NewsItem) => {
    const text = translated(item);
    return (
      (category === ALL || item.category === category) &&
      `${text.title} ${text.lead}`
        .toLocaleLowerCase(ro ? "ro" : "hu")
        .includes(query.toLocaleLowerCase(ro ? "ro" : "hu"))
    );
  };

  const list = useMemo(() => {
    const selected = view === "top" ? feed.top : view === "latest" ? feed.latest : feed.singles;
    return selected.filter(
      (item) => (view !== "singles" || matchesLanguage(item)) && matches(item),
    );
    // matchesLanguage and matches intentionally follow the active language and filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, view, category, query, lang]);
  const sidebar = feed.singles.filter(matchesLanguage).filter(matches).slice(0, 25);
  const [lead, side1, side2, ...rest] = list;
  const title =
    view === "top"
      ? ro
        ? "Știri de top"
        : "Top hírek"
      : view === "latest"
        ? ro
          ? "Ultimele știri"
          : "Friss hírek"
        : ro
          ? "Flux de știri"
          : "Hírfolyam";

  const resetLimit = () => setLimit(60);
  const timeline = (items: NewsItem[]) => (
    <ol className="space-y-5 border-l border-border pl-4">
      {items.map((item) => (
        <li key={item.group_id} className="relative">
          <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary/60" />
          <StoryLink item={item} className="group block">
            <time className="text-[10px] font-bold uppercase text-muted-foreground">
              {formatDate(item.published_at, lang)} · {item.sources[0]?.source}
            </time>
            <h3 className="mt-1 text-sm font-bold leading-snug transition-colors group-hover:text-primary">
              <RichText text={translated(item).title} />
            </h3>
          </StoryLink>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="mx-auto flex h-17 max-w-7xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-5 md:gap-8">
            <Link to="/" aria-label={ro ? "Stirix.ro pagina principală" : "Stirix.ro főoldal"}>
              <BrandLogo className="h-10 w-32 object-contain object-left sm:w-40" />
            </Link>
            <label className="hidden items-center gap-3 rounded-full border border-input bg-secondary px-4 focus-within:border-primary/50 md:flex">
              <span className="size-2 shrink-0 rounded-full bg-primary motion-safe:animate-live" />
              <span className="sr-only">{ro ? "Căutare în știri" : "Keresés a hírek között"}</span>
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  resetLimit();
                }}
                placeholder={ro ? "Caută știri…" : "Keresés hírekre…"}
                className="h-10 w-60 min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="flex items-center">
              {LANGS.map((item) => (
                <Button
                  key={item}
                  variant="ghost"
                  size="sm"
                  onClick={() => setLang(item)}
                  className={lang === item ? "text-primary" : ""}
                >
                  {item.toUpperCase()}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label={
                mobileSearch
                  ? ro
                    ? "Închide căutarea"
                    : "Kereső bezárása"
                  : ro
                    ? "Căutare"
                    : "Keresés"
              }
              onClick={() => setMobileSearch((value) => !value)}
            >
              {mobileSearch ? <X className="size-4" /> : <Search className="size-4" />}
            </Button>
            <SiteMenu />
          </div>
        </div>
        {mobileSearch && (
          <div className="border-t border-border px-4 py-3 md:hidden">
            <label className="flex items-center gap-2 rounded-md border border-input bg-secondary px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">{ro ? "Căutare în știri" : "Keresés a hírek között"}</span>
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  resetLimit();
                }}
                placeholder={ro ? "Caută știri…" : "Keresés hírekre…"}
                className="h-10 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-4">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <nav
            aria-label={ro ? "Categorii de știri" : "Hírkategóriák"}
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto"
          >
            {[ALL, ...CATEGORIES].map((item) => (
              <Button
                key={item}
                variant={category === item ? "default" : "ghost"}
                size="sm"
                aria-pressed={category === item}
                onClick={() => {
                  setCategory(item);
                  resetLimit();
                }}
                className="whitespace-nowrap"
              >
                {labelCategory(item)}
              </Button>
            ))}
          </nav>
          <Link
            to="/osszes"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 gap-2")}
          >
            <Library className="size-3.5" />
            <span className="hidden sm:inline">
              {ro ? "Toate știrile (arhivă)" : "Minden hír (archívum)"}
            </span>
            <span className="sm:hidden">{ro ? "Arhivă" : "Archívum"}</span>
          </Link>
        </div>

        <div className="mb-5 flex items-center justify-between gap-2 border-b border-border py-2">
          <nav
            aria-label={ro ? "Vizualizări de știri" : "Hírnézetek"}
            className="flex min-w-0 gap-1 overflow-x-auto"
          >
            <Link
              to="/"
              aria-current={view === "top" ? "page" : undefined}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "gap-1.5 whitespace-nowrap px-2 text-xs",
                view === "top" && "bg-primary/10 text-primary",
              )}
            >
              <Flame className="size-3.5" />
              {ro ? "Știri de top" : "Top hírek"}
            </Link>
            <Link
              to="/friss"
              aria-current={view === "latest" ? "page" : undefined}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "gap-1.5 whitespace-nowrap px-2 text-xs",
                view === "latest" && "bg-primary/10 text-primary",
              )}
            >
              <Clock3 className="size-3.5" />
              {ro ? "Ultimele știri" : "Friss hírek"}
            </Link>
            <Link
              to="/hirfolyam"
              aria-current={view === "singles" ? "page" : undefined}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "gap-1.5 whitespace-nowrap px-2 text-xs",
                view === "singles" && "bg-primary/10 text-primary",
              )}
            >
              <Radio className="size-3.5" />
              {ro ? "Flux de știri" : "Hírfolyam"}
            </Link>
          </nav>
          <h1 className="sr-only">{title}</h1>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {list.length} {ro ? "știri" : "hír"}
          </span>
        </div>

        {view !== "singles" ? (
          <>
            {lead && (
              <section
                aria-label={ro ? "Știri principale" : "Kiemelt hírek"}
                className="grid grid-cols-12 gap-4 lg:auto-rows-[240px]"
              >
                <article className="col-span-12 min-w-0 lg:col-span-8 lg:row-span-2">
                  <StoryLink
                    item={lead}
                    className="group relative flex h-full flex-col justify-end overflow-hidden rounded-lg border border-primary/25 bg-card transition-colors hover:border-primary/50"
                  >
                    <img
                      src={heroPhoto(lead.category, `${lead.title} ${lead.lead}`, lead.group_id)}
                      alt=""
                      aria-hidden
                      loading="eager"
                      className="absolute inset-0 size-full object-cover opacity-75 transition-opacity duration-500 group-hover:opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/25" />
                    <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
                    <div className="relative p-5 sm:p-8">
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <span className="rounded-sm border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">
                          ✨ {ro ? "Știre sintetizată cu AI" : "AI összesített hír"}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                          {labelCategory(lead.category)} · {formatDate(lead.published_at, lang)}
                        </span>
                      </div>
                      <h2 className="max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">
                        <RichText text={translated(lead).title} />
                      </h2>
                      {translated(lead).lead && (
                        <p className="mt-4 line-clamp-3 max-w-2xl text-sm leading-relaxed text-foreground/65 sm:text-base">
                          <RichText text={translated(lead).lead} />
                        </p>
                      )}
                      <p className="mt-5 text-xs font-medium uppercase text-muted-foreground">
                        {ro
                          ? `Pe baza a ${lead.sources.length} surse`
                          : `${lead.sources.length} forrás alapján`}
                      </p>
                    </div>
                  </StoryLink>
                </article>
                {[side1, side2]
                  .filter((item): item is NewsItem => Boolean(item))
                  .map((item) => (
                    <article
                      key={item.group_id}
                      className="col-span-12 min-w-0 sm:col-span-6 lg:col-span-4"
                    >
                      <StoryLink
                        item={item}
                        className="group flex h-full min-h-44 flex-col justify-between rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/30"
                      >
                        <div>
                          <p className="mb-3 text-[10px] font-bold uppercase text-primary">
                            ✨ AI · {labelCategory(item.category)}
                          </p>
                          <h2 className="line-clamp-4 font-display text-xl font-bold leading-tight transition-colors group-hover:text-primary">
                            <RichText text={translated(item).title} />
                          </h2>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {formatDate(item.published_at, lang)}
                          </span>
                          <Coverage item={item} lang={lang} />
                        </div>
                      </StoryLink>
                    </article>
                  ))}
              </section>
            )}

            <section className="mt-10 grid grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-8">
                <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
                  <h2 className="font-display text-sm font-extrabold uppercase">
                    {ro ? "Știri sintetizate cu AI" : "AI összesített hírek"}
                  </h2>
                  <span className="text-[10px] text-muted-foreground">
                    {list.length} {ro ? "știri" : "hír"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-9 md:grid-cols-2">
                  {rest.map((item, index) => (
                    <article key={item.group_id} className="min-w-0">
                      <StoryLink item={item} className="group block">
                        <div className="mb-4 flex items-center justify-between border-t-2 border-primary/60 pt-3">
                          <span className="text-[9px] font-bold uppercase text-primary">
                            ✨ {ro ? "Sintetizat cu AI" : "AI összesített"}
                          </span>
                          <span className="font-display text-2xl font-extrabold text-primary/30">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase text-muted-foreground">
                          <span>{labelCategory(item.category)}</span>
                          <span>{formatDate(item.published_at, lang)}</span>
                        </div>
                        <h3 className="font-display text-lg font-bold leading-tight transition-colors group-hover:text-primary">
                          <RichText text={translated(item).title} />
                        </h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          <RichText text={translated(item).lead} />
                        </p>
                        <p className="mt-3 border-t border-border pt-3 text-[10px] font-bold text-primary">
                          {ro
                            ? `Pe baza a ${item.sources.length} surse`
                            : `${item.sources.length} forrás alapján`}{" "}
                          <span className="font-medium text-muted-foreground">
                            {item.sources
                              .slice(0, 3)
                              .map((source) => source.source)
                              .join(" · ")}
                          </span>
                        </p>
                      </StoryLink>
                    </article>
                  ))}
                </div>
                {!list.length && (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    {ro ? "Niciun rezultat." : "Nincs találat."}
                  </p>
                )}
              </div>
              <aside
                aria-label={ro ? "Știri dintr-o sursă" : "Egyforrású hírek"}
                className="col-span-12 border-t border-border pt-4 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
              >
                <div className="lg:sticky lg:top-24">
                  <h2 className="mb-6 flex items-center justify-between font-display text-sm font-extrabold uppercase">
                    <Link to="/hirfolyam" className="hover:text-primary">
                      {ro ? "Flux de știri →" : "Hírfolyam →"}
                    </Link>
                    <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="size-2 rounded-full bg-primary motion-safe:animate-live" />
                      {ro ? "Live" : "Élő"}
                    </span>
                  </h2>
                  <div className="max-h-[60vh] overflow-y-auto pl-1">
                    {timeline(sidebar)}
                    {!sidebar.length && (
                      <p className="text-xs text-muted-foreground">
                        {ro ? "Niciun rezultat." : "Nincs találat."}
                      </p>
                    )}
                  </div>
                </div>
              </aside>
            </section>
          </>
        ) : (
          <section
            aria-label={ro ? "Flux de știri în ordine cronologică" : "Hírfolyam időrendben"}
            className="max-w-4xl py-3"
          >
            {timeline(list.slice(0, limit))}
            {!list.length && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                {ro ? "Niciun rezultat." : "Nincs találat."}
              </p>
            )}
            {list.length > limit && (
              <div className="mt-8 flex justify-center">
                <Button variant="outline" onClick={() => setLimit((value) => value + 60)}>
                  {ro ? "Mai multe știri" : "További hírek"}
                </Button>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="mt-16 border-t border-border py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 text-xs text-muted-foreground">
          <BrandLogo className="h-10 w-40 object-contain" />
          <span>
            © 2026 Stirix.ro · {ro ? "Toate știrile într-un singur loc" : "Minden hír egy helyen"}
          </span>
          <Link to="/forrasok" className="hover:text-primary">
            {ro ? "Surse" : "Források"}
          </Link>
        </div>
      </footer>
    </div>
  );
}
