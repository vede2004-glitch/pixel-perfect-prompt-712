import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";
import { StudioShell } from "@/components/studio/StudioShell";
import { Button } from "@/components/ui/button";
import { studioHead, prepareSearch } from "@/lib/studio";

export const Route = createFileRoute("/newsroom_/prepare")({ validateSearch: prepareSearch, head: () => studioHead("Hírek előkészítése", "A kiválasztott hírek előkészítése rádiós feldolgozásra."), component: Prepare });
function Prepare() {
  const { ids } = Route.useSearch();
  return <StudioShell><main className="mx-auto max-w-4xl px-5 py-10"><Link to="/newsroom" search={{hours:6,sources:""}} className="mb-8 inline-flex items-center gap-2 text-sm text-studio-cyan"><ArrowLeft className="size-4" />Vissza a hírekhez</Link><h1 className="font-display text-2xl font-semibold">Hírek előkészítése</h1><div className="mt-8 border-y border-border py-12 text-center"><FileText className="mx-auto mb-4 size-9 text-muted-foreground" /><p className="font-semibold">{ids ? "A kiválasztott hírek betöltéséhez csatlakozás szükséges" : "Még nincs kiválasztott hír"}</p><p className="mt-3 text-sm text-muted-foreground">{ids ? "A hírgyűjtő szolgáltatás még nem aktív." : "A Newsroomban jelöld ki az előkészítendő híreket."}</p></div><Button size="default" disabled className="mt-6"><FileText className="mr-2 size-4" />Generálás</Button></main></StudioShell>;
}