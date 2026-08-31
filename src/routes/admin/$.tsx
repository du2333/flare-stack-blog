import { createFileRoute, notFound } from "@tanstack/react-router";
import { NotFound } from "@/components/common/not-found";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/$")({
  loader: () => {
    throw notFound();
  },
  component: NotFound,
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      {
        title: m.not_found_title(),
      },
    ],
  }),
});
