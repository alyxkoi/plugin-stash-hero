import { createFileRoute } from "@tanstack/react-router";
import { LibraryView } from "@/components/LibraryView";

export const Route = createFileRoute("/account/library")({
  head: () => ({ meta: [{ title: "Your Stash — Plugin Warehouse" }] }),
  component: () => <LibraryView />,
});
