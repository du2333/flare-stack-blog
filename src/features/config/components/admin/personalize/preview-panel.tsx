import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { adminPostsQuery } from "@/features/posts/queries";
import { m } from "@/paraglide/messages";
import type { PreviewDevice } from "./preview-geometry";
import {
  usePreviewAddress,
  type PreviewTarget,
  type PreviewValues,
} from "./preview-address";
import { PreviewStage } from "./preview-stage";

type PreviewPage = "home" | "post";

/** The path of the newest published Post, or null while there is none. */
function useNewestPostPath(): string | null {
  const { data } = useQuery({
    ...adminPostsQuery({
      status: "published",
      sortBy: "publishedAt",
      sortDir: "DESC",
      limit: 1,
    }),
    select: (posts) => posts.items[0]?.publicSlug ?? null,
  });
  return data ? `/post/${encodeURIComponent(data)}` : null;
}

/**
 * The live preview: switches for the device and for the home page or a Post,
 * and the page itself. `actions` sit beside the switches, such as a button
 * that closes a full-screen preview. Mounting it is what starts loading the
 * public page.
 */
export function PreviewPanel({
  values,
  fit,
  initialDevice,
  actions,
}: {
  values: PreviewValues;
  fit: "width" | "box";
  initialDevice: PreviewDevice;
  actions?: ReactNode;
}) {
  const [device, setDevice] = useState<PreviewDevice>(initialDevice);
  const [page, setPage] = useState<PreviewPage>("home");
  const postPath = useNewestPostPath();
  const target: PreviewTarget =
    page === "post" && postPath
      ? { kind: "post", path: postPath }
      : { kind: "home" };
  const address = usePreviewAddress(values, target);

  return (
    <section
      className="personalize-preview"
      aria-label={m.personalize_preview_heading()}
    >
      <div className="personalize-preview-bar">
        <SegmentedControl
          size="sm"
          aria-label={m.personalize_preview_device()}
          items={[
            { value: "desktop", label: m.personalize_preview_device_desktop() },
            { value: "phone", label: m.personalize_preview_device_phone() },
          ]}
          value={device}
          onValueChange={setDevice}
        />
        {postPath ? (
          <SegmentedControl
            size="sm"
            aria-label={m.personalize_preview_page()}
            items={[
              { value: "home", label: m.personalize_preview_page_home() },
              { value: "post", label: m.personalize_preview_page_post() },
            ]}
            value={page}
            onValueChange={setPage}
          />
        ) : null}
        {actions}
      </div>
      <PreviewStage
        address={address}
        device={device}
        fit={fit}
        live={{
          bannerFocus: values.bannerFocus,
          primaryHue: values.primaryHue,
        }}
      />
    </section>
  );
}
