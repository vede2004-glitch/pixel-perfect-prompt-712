import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AudioLines, Bell, Radio, Newspaper, Music2, History, Settings2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function StudioBrand() {
  return <div className="flex items-center gap-3"><AudioLines className="size-9 text-studio-cyan" /><div><div className="font-display text-lg font-bold">STIRIX <span className="text-primary">STUDIO</span></div><p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">B2B Radio Newsroom</p></div></div>;
}
export function StudioShell({ children }: { children: ReactNode }) {
  return <div className="studio min-h-screen bg-background text-foreground font-sans">
    <header className="studio-header border-b border-border bg-background">
      <StudioBrand />
      <nav className="studio-nav flex items-center gap-2" aria-label="Studio menü">
        <Link to="/newsroom" search={{hours:6,sources:""}} className="flex h-14 items-center gap-2 border-b-2 border-studio-cyan px-3 text-xs font-semibold text-studio-cyan"><Newspaper className="size-4" />Newsroom</Link>
        <Button variant="ghost" disabled title="Még nem elérhető"><Music2 className="mr-2 size-4" />Audio könyvtár</Button>
        <Button variant="ghost" disabled title="Még nem elérhető"><History className="mr-2 size-4" />Korábbi adások</Button>
        <Button variant="ghost" disabled title="Bejelentkezés szükséges"><Settings2 className="mr-2 size-4" />Beállítások</Button>
      </nav>
      <div className="flex items-center gap-2"><Button size="icon" variant="ghost" disabled aria-label="Értesítések"><Bell className="size-4" /></Button><DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="outline" aria-label="Fiók"><LockKeyhole className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem asChild><Link to="/login">Bejelentkezés</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
    </header>{children}
  </div>;
}