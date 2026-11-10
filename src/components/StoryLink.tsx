import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { articlePath, type NewsItem } from "@/lib/news";

export function StoryLink({ item, className, children }: { item: NewsItem; className: string; children: ReactNode }) {
  const source = item.sources[0];
  return !item.is_synthesized && source?.link ? (
    <a href={source.link} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>
  ) : (
    <Link to="/hir/$id" params={{ id: articlePath(item) }} className={className}>{children}</Link>
  );
}