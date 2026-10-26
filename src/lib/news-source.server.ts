// A friss news.json beolvasása a GitHub repóból – CDN-gyorsítótár nélkül.
// A raw.githubusercontent.com a /main/ címet 5 percig gyorsítótárazza (és a ?t=
// paramétert figyelmen kívül hagyja), ezért előbb lekérjük a news.json utolsó
// commitjának SHA-ját, és a fájlt azzal a pontos címmel töltjük le.

type Repo = { owner: string; repo: string; branch: string; path: string };

const DEFAULT_REPO: Repo = {
  owner: "vede2004-glitch",
  repo: "pixel-perfect-prompt-712",
  branch: "main",
  path: "src/data/news.json",
};

const CACHE_MS = 30_000;
let cached: { at: number; data: unknown[] } | null = null;
let inflight: Promise<unknown[] | null> | null = null;

function repoFromEnv(): Repo {
  const raw = process.env["NEWS_JSON_URL"];
  const m = raw && /raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/([^?#]+)/.exec(raw);
  return m ? { owner: m[1]!, repo: m[2]!, branch: m[3]!, path: m[4]! } : DEFAULT_REPO;
}

async function latestSha(r: Repo): Promise<string | null> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "stirix-news",
  };
  const token = process.env["GITHUB_TOKEN"];
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${r.owner}/${r.repo}/commits?sha=${r.branch}&path=${encodeURIComponent(r.path)}&per_page=1`,
      { headers, cache: "no-store" },
    );
    if (!res.ok) return null;
    const list = (await res.json()) as Array<{ sha?: string }>;
    return list[0]?.sha ?? null;
  } catch {
    return null;
  }
}

async function fetchJson(url: string): Promise<unknown[] | null> {
  try {
    const res = await fetch(url, { cache: "no-store", headers: { "cache-control": "no-cache" } });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length ? data : null;
  } catch {
    return null;
  }
}

async function load(): Promise<unknown[] | null> {
  const r = repoFromEnv();
  const sha = await latestSha(r);
  const base = `https://raw.githubusercontent.com/${r.owner}/${r.repo}`;
  if (sha) {
    const data = await fetchJson(`${base}/${sha}/${r.path}`);
    if (data) return data;
  }
  // Tartalék: a branch címe (legfeljebb 5 perccel késhet).
  return fetchJson(`${base}/${r.branch}/${r.path}?t=${Date.now()}`);
}

/** A repó legfrissebb news.json tartalma (30 mp-es memóriagyorsítótárral). */
export async function loadLiveNewsRaw(): Promise<unknown[] | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;
  if (!inflight) {
    inflight = load()
      .then((data) => {
        if (data) cached = { at: Date.now(), data };
        return data ?? cached?.data ?? null;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
