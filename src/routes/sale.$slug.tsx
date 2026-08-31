import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/sale/$slug")({
  beforeLoad: () => {
    throw redirect({ to: "/deals", statusCode: 301 });
  },
  component: () => null,
});
