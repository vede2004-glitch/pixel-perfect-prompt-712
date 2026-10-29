import { ChevronDown, ExternalLink, Maximize2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RichText } from "@/components/RichText";
import type { StudioNews } from "@/lib/studio";

export function StudioNewsCard({ item, selected, onSelect }: { item: StudioNews; selected: boolean; onSelect: () => void }) {
  const sources = item.sources.length ? item.sources : [{ source: item.source ?? "Ismeretlen" }];
  const label = sources.length > 1 ? `${sources.length} forrás` : sources[0]?.source;
  return <article className="flex gap-3 rounded-lg border border-border bg-card p-3">
    <div className="min-w-0 flex-1">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-studio-cyan">{label}</span>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" aria-label={`${item.title_hu} kinagyítása`} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><Maximize2 className="size-3.5" /></button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <span className="text-xs font-medium text-studio-cyan">{label}{item.published_at ? ` · ${new Date(item.published_at * 1000).toLocaleString("hu-HU", { dateStyle: "short", timeStyle: "short" })}` : ""}</span>
                <DialogTitle className="text-xl leading-7"><RichText text={item.title_hu} /></DialogTitle>
                <DialogDescription className="sr-only">Hír részletei és források</DialogDescription>
              </DialogHeader>
              <div className="text-base leading-7 text-foreground"><RichText text={item.lead_hu || "Nincs összefoglaló."} /></div>
              <div>
                <h4 className="mb-2 text-sm font-semibold">Források</h4>
                <ul className="space-y-2">{sources.map((s, i) => <li key={`${s.source}-${i}`} className="text-sm">{s.link ? <a href={s.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-studio-cyan underline">{s.source}<ExternalLink className="size-3.5" /></a> : s.source}</li>)}</ul>
              </div>
            </DialogContent>
          </Dialog>
          <Checkbox checked={selected} onCheckedChange={onSelect} aria-label={`${item.title_hu} kijelölése`} />
        </div>
      </div>
      <h3 className="text-sm font-bold leading-5"><RichText text={item.title_hu} /></h3>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground"><RichText text={item.lead_hu} /></p>
      <details className="mt-2 text-xs text-muted-foreground"><summary className="flex cursor-pointer items-center justify-between">Források<ChevronDown className="size-3 text-studio-cyan" /></summary><ul className="mt-2 space-y-1">{sources.map((s,i) => <li key={`${s.source}-${i}`}>{s.link ? <a href={s.link} target="_blank" rel="noreferrer" className="text-studio-cyan underline">{s.source}</a> : s.source}</li>)}</ul></details>
    </div>
  </article>;
}
