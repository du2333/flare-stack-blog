import { createFileRoute, notFound } from "@tanstack/react-router";
import { NotFound } from "@/components/common/not-found";
import { CACHE_CONTROL } from "@/lib/constants";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_public/$")({
  loader: () => {
    throw notFound();
  },
  component: NotFound,
  notFoundComponent: NotFound,
  headers: () => CACHE_CONTROL.notFound,
  head: () => ({
    meta: [
      {
        title: m.not_found_title(),
      },
    ],
  }),
});
