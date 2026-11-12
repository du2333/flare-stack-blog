import { Lock, Monitor, Smartphone } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { m } from "@/paraglide/messages";
import { PREVIEW_VIEWPORT, type PreviewDevice } from "./preview-geometry";
import { usePreviewAddress, type PreviewValues } from "./preview-address";
import { PreviewStage } from "./preview-stage";

/**
 * The live preview, as a browser window: its bar with the site's address, the
 * size of the viewport and a switch for the device, and the page itself,
 * which the Admin can click through. `actions` sit beside the
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
      data-device={device}
      aria-label={m.personalize_preview_heading()}
    >
      {/* The window's bar: its lights, the site's address, then the device. */}
      <div className="personalize-preview-bar">
        <span className="personalize-lights" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="personalize-address" aria-hidden="true">
          <Lock size={11} />
          {typeof window === "undefined" ? "" : window.location.host}
        </span>
        <span
          className="personalize-preview-size"
          aria-label={m.personalize_preview_size()}
        >
          {PREVIEW_VIEWPORT[device].width} × {PREVIEW_VIEWPORT[device].height}
        </span>
        <SegmentedControl
          size="sm"
          aria-label={m.personalize_preview_device()}
          items={[
            {
              value: "desktop",
              label: (
                <>
                  <Monitor size={15} aria-hidden="true" />
                  <span className="sr-only">
                    {m.personalize_preview_device_desktop()}
                  </span>
                </>
              ),
            },
            {
              value: "phone",
              label: (
                <>
                  <Smartphone size={15} aria-hidden="true" />
                  <span className="sr-only">
                    {m.personalize_preview_device_phone()}
                  </span>
                </>
              ),
            },
          ]}
          value={device}
          onValueChange={setDevice}
        />
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
