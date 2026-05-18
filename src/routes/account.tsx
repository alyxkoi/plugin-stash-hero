import { createFileRoute } from "@tanstack/react-router";
import { AccountLayout } from "@/components/AccountLayout";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Your Account — Plugin Warehouse" }] }),
  component: AccountLayout,
});
