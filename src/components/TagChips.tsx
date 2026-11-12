import { Link } from "@tanstack/react-router";
import { useLang } from "@/lib/lang";
import { tagLabel, type NewsItem } from "@/lib/news";
import { cn } from "@/lib/utils";

export function TagChips({
  item,
  limit = 3,
  className,
}: {
  item: NewsItem;
  limit?: number;
  className?: string;
}) {
  const lang = useLang();
  const tags = item.tags.slice(0, limit);
  if (!tags.length) return null;

  return (
    <div className={cn("relative z-10 flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <Link
          key={tag}
          to="/tag/$tagName"
          params={{ tagName: tag }}
          aria-label={tagLabel(tag, lang)}
          className="rounded-full border border-border bg-secondary/90 px-2.5 py-1 text-[10px] font-bold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          #{tagLabel(tag, lang)}
        </Link>
      ))}
    </div>
  );
}
