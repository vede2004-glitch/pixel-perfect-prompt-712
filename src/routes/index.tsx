import { createFileRoute } from "@tanstack/react-router";
import { NewsFeed } from "@/components/NewsFeed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Friss hírek – Stirix.ro" },
      {
        name: "description",
        content:
          "A Stirix AI-összesített hírei időrendben, a legújabbakkal kezdve, magyarul és románul.",
      },
      { property: "og:title", content: "Friss hírek – Stirix.ro" },
      {
        property: "og:description",
        content:
          "A Stirix AI-összesített hírei időrendben, a legújabbakkal kezdve, magyarul és románul.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FreshNews,
});

function FreshNews() {
  return <NewsFeed view="latest" />;
}
