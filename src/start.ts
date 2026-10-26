import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { domainRedirect } from "./lib/domains";
import { supabase } from "./integrations/supabase/client";

const attachSupabaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await supabase.auth.getSession();
  return next({ headers: data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {} });
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

// A böngésző soha ne tartsa meg a régi oldaldokumentumot: minden navigáció
// a legújabb kiadást kapja meg (a hír-adatok a buildbe vannak égetve).
const htmlNoStore = createMiddleware().server(async ({ next }) => {
  const result = await next();
  const response: Response | undefined =
    result instanceof Response ? result : (result as { response?: Response })?.response;
  if (response && (response.headers.get("content-type") ?? "").includes("text/html")) {
    try {
      response.headers.set("cache-control", "no-store, max-age=0");
    } catch {
      // A válasz fejléce nem írható át: a tartalom így is kiszolgálódik.
    }
  }
  return result;
});

// stirix.ro → 301 hirx.ro (magyar böngésző) vagy strix.ro (minden más).
const domainMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  const cookie = request.headers.get("cookie") ?? "";
  // A látogató kifejezetten a románt választotta: ne dobjuk vissza a hirx.ro-ra.
  if (url.searchParams.get("lang") === "ro" || /(?:^|;\s*)stirix-lang=ro/.test(cookie)) {
    const res = await next();
    if (url.searchParams.get("lang") === "ro") {
      try { (res as any).response?.headers.append("set-cookie", "stirix-lang=ro; Path=/; Max-Age=31536000; SameSite=Lax"); } catch {}
    }
    return res;
  }
  const target = domainRedirect(request.headers.get("host") ?? url.host, request.headers.get("accept-language"), url.pathname + url.search);
  if (target) return new Response(null, { status: 302, headers: { location: target, vary: "Accept-Language, Cookie" } });
  return next();
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [htmlNoStore, domainMiddleware, errorMiddleware, csrfMiddleware],
}));
