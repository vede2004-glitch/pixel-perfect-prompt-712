import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LockKeyhole, User, ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { StudioBrand } from "@/components/studio/StudioShell";
import { studioHead } from "@/lib/studio";

export const LOGIN_DOMAIN = "stirix.ro";
export function usernameToEmail(name: string) {
  const v = name.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${LOGIN_DOMAIN}`;
}
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({ head: () => studioHead("Bejelentkezés", "Belépés a STIRIX Studio rádiós hírszerkesztőjébe."), component: Login });

function Login() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(email), password });
    setBusy(false);
    if (error) {
      setError(error.message.includes("Invalid login") ? "Hibás név vagy jelszó." : error.message);
      return;
    }
    void navigate({ to: "/newsroom", search: { hours: 6, sources: "" }, replace: true });
  }

  return <main className="studio flex min-h-screen flex-col bg-background p-6 text-foreground"><StudioBrand /><div className="m-auto w-full max-w-sm py-16"><div className="mb-8 flex size-12 items-center justify-center rounded-lg border border-border bg-card"><LockKeyhole className="size-6 text-studio-cyan" /></div><p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Szerkesztőségi belépés</p><h1 className="font-display text-3xl font-semibold">Üdv a Studióban.</h1><form className="mt-8 space-y-5" onSubmit={onSubmit}><div><label htmlFor="email" className="mb-2 block text-sm">Név</label><div className="relative"><User className="absolute left-3 top-3 size-4 text-muted-foreground" /><input id="email" type="text" required autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" className="h-11 w-full rounded-md border border-input bg-card pl-10 pr-3 text-sm outline-none focus:border-studio-cyan" placeholder="pl. admin" /></div></div><div><label htmlFor="password" className="mb-2 block text-sm">Jelszó</label><input id="password" required value={password} onChange={(e) => setPassword(e.target.value)} type={visible ? "text" : "password"} autoComplete="current-password" className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm outline-none focus:border-studio-cyan" placeholder="Jelszó" /><label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />Jelszó megjelenítése</label></div><Button type="submit" disabled={busy} size="default" className="w-full">{busy ? "Belépés…" : "Bejelentkezés"}<ArrowRight className="ml-2 size-4" /></Button>{error ? <p role="alert" className="text-xs text-destructive">{error}</p> : <p role="status" className="text-xs leading-5 text-muted-foreground">A fiókokat a szerkesztőség vezetője hozza létre.</p>}</form></div><p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">STIRIX Studio · B2B Radio Newsroom</p></main>;
}
