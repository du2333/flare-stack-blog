import { useRef, useState, type ReactNode } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { m } from "@/paraglide/messages";
import { PREVIEW_VIEWPORT, type PreviewDevice } from "./preview-geometry";
import { usePreviewAddress, type PreviewValues } from "./preview-address";
import { PreviewStage } from "./preview-stage";

/**
 * The live preview: a switch for the device, the size of its viewport, and
 * the page itself, which the Admin can click through. `actions` sit beside the
 * switch, such as a button that closes a full-screen preview. Mounting it is
 * what starts loading the public page.
 */
export function PreviewPanel({
  values,
  initialDevice,
  actions,
}: {
  values: PreviewValues;
  initialDevice: PreviewDevice;
  actions?: ReactNode;
}) {
  const [device, setDevice] = useState<PreviewDevice>(initialDevice);
  // Where the stage reads the path of the page the Admin is looking at.
  const readPath = useRef<() => string | null>(() => null);
  const address = usePreviewAddress(values, () => readPath.current());

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
        <span
          className="personalize-preview-size"
          aria-label={m.personalize_preview_size()}
        >
          {PREVIEW_VIEWPORT[device].width} × {PREVIEW_VIEWPORT[device].height}
        </span>
        {actions}
      </div>
      <PreviewStage
        address={address}
        device={device}
        readPath={readPath}
        live={{
          bannerFocus: values.bannerFocus,
          primaryHue: values.primaryHue,
        }}
      />
    </section>
  );
}
