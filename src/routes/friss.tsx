import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/components/PageShell";
import { NewsFeed } from "@/components/NewsFeed";

export const Route = createFileRoute("/friss")({
  head: () =>
    meta(
      "Friss hírek – Stirix.ro",
      "A Stirix AI-összesített hírei időrendben, a legújabbakkal kezdve, magyarul és románul.",
    ),
  component: FreshNews,
});

function FreshNews() {
  return <NewsFeed view="latest" />;
}
