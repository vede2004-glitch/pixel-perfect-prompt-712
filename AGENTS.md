<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the Stirix interface dark-first with semantic graphite/emerald tokens, Sora headings, and Manrope body text so new screens remain brand-consistent.
- The Forrásaink page shows a fixed, hand-maintained source list; do not build editable source-manager UIs unless the user asks again.
- Generate NewsArticle JSON-LD from the article route loader via src/lib/article-schema.ts so crawler-visible metadata matches the SSR article and preserves original-source citations without inventing authors or modification dates.
- Serve brand logos from real files in `public` (never asset pointers) so external deployments don't depend on Lovable asset routing; BrandLogo picks by language and theme: HU shows `/hirx-logo.png` (dark theme) / `/hirx-logo-dark.png` (light theme), RO shows `/stirix-logo.png` / `/stirix-logo-dark.png`; favicon is the X mark.
- Derive the shared 96px PNG favicon and multi-size ICO fallback from the public X mark, and declare PNG dimensions in the root head so browsers and search crawlers receive the same icon on both domains.
- Keep news.json bundled as a fallback, but read the live copy from GitHub by the file's latest commit SHA (src/lib/news-source.server.ts) because bot commits use [skip ci] and the raw /main/ CDN lags 5 minutes; the root loader hands newer data to SSR so the first paint never flashes the bundled list, and the no-store `/api/public/news` endpoint (`?meta=1`) drives in-page polling.
- Keep Studio surfaces separate from the public site and use scoped semantic tokens; until real auth and the Python service are connected, show explicit inactive states without fake sessions or substituted engine data.
- Validate newsroom payloads through the shared Studio contract and source list extracted from the Python engine; selection IDs travel to the un-nested preparation route so the dashboard cannot swallow that page.
