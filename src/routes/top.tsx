import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/components/PageShell";
import { NewsFeed } from "@/components/NewsFeed";

export const Route = createFileRoute("/top")({
  head: () =>
    meta(
      "Top hírek – Stirix.ro",
      "Románia legfontosabb hírei magyarul és románul, több forrásból, AI-összefoglalókkal.",
    ),
  component: TopNews,
});

function TopNews() {
  return <NewsFeed view="top" />;
}
