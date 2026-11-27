import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/friss")({
  beforeLoad: () => {
    throw redirect({ to: "/", statusCode: 301 });
  },
});
