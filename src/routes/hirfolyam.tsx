import { createFileRoute } from "@tanstack/react-router";
import { meta } from "@/components/PageShell";
import { NewsFeed } from "@/components/NewsFeed";

export const Route = createFileRoute("/hirfolyam")({
  head: () => meta(
    "Hírfolyam – Stirix.ro",
    "Egyforrású romániai hírek időrendben, közvetlen hivatkozással az eredeti cikkekhez.",
  ),
  component: NewsStream,
});

function NewsStream() {
  return <NewsFeed view="singles" />;
}
