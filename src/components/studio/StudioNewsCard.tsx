import { ChevronDown, Newspaper } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RichText } from "@/components/RichText";
import type { StudioNews } from "@/lib/studio";

export function StudioNewsCard({ item, selected, onSelect }: { item: StudioNews; selected: boolean; onSelect: () => void }) {
  const sources = item.sources.length ? item.sources : [{ source: item.source ?? "Ismeretlen" }];
  return <article className="flex gap-3 rounded-lg border border-border bg-card p-3">
    {item.image ? <img src={item.image} alt="" className="h-28 w-24 shrink-0 rounded-md object-cover" /> : <div className="grid h-28 w-24 shrink-0 place-content-center rounded-md bg-secondary"><Newspaper className="size-7 text-muted-foreground" /></div>}
    <div className="min-w-0 flex-1"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs text-studio-cyan">{sources.length > 1 ? `${sources.length} forrás` : sources[0]?.source}</span><Checkbox checked={selected} onCheckedChange={onSelect} aria-label={`${item.title_hu} kijelölése`} /></div><h3 className="text-sm font-bold leading-5"><RichText text={item.title_hu} /></h3><p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground"><RichText text={item.lead_hu} /></p><details className="mt-2 text-xs text-muted-foreground"><summary className="flex cursor-pointer items-center justify-between">Források<ChevronDown className="size-3 text-studio-cyan" /></summary><ul className="mt-2 space-y-1">{sources.map((s,i) => <li key={`${s.source}-${i}`}>{s.link ? <a href={s.link} target="_blank" rel="noreferrer" className="text-studio-cyan underline">{s.source}</a> : s.source}</li>)}</ul></details></div>
  </article>;
}