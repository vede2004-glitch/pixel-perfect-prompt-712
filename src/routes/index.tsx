import { createFileRoute } from "@tanstack/react-router";
import { NewsFeed } from "@/components/NewsFeed";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Top hírek – Stirix.ro" },
      {
        name: "description",
        content:
          "Románia legfontosabb hírei magyarul és románul, több forrásból, AI-összefoglalókkal.",
      },
      { property: "og:title", content: "Top hírek – Stirix.ro" },
      {
        property: "og:description",
        content:
          "Románia legfontosabb hírei magyarul és románul, több forrásból, AI-összefoglalókkal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TopNews,
});

function TopNews() {
  return <NewsFeed view="top" />;
}
