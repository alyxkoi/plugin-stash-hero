import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/account/orders/$id")({
  beforeLoad: () => {
    throw redirect({ to: "/account/orders" });
  },
  component: () => null,
});
