import { createFileRoute } from "@tanstack/react-router";
import raw from "@/data/news.json";
import { bundledNewsMeta } from "@/lib/news";

// A hír-adatok a buildbe vannak égetve; ez a végpont a éppen kiszolgált kiadás
// tartalmát adja vissza gyorsítótár nélkül, hogy a böngésző soha ne mutasson
// régi híreket. A `?meta=1` válasz pár bájt, a teljes lista a friss news.json.
const NO_STORE = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
};

export const Route = createFileRoute("/api/public/news")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("meta") === "1") return Response.json(bundledNewsMeta, { headers: NO_STORE });
        return new Response(JSON.stringify(raw), { headers: NO_STORE });
      },
    },
  },
});
