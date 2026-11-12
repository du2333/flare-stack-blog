import { CircleAlert } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Spinner } from "@/components/ui/spinner";
import { m } from "@/paraglide/messages";
import {
  PREVIEW_FRAME_SIZE,
  previewScale,
  type PreviewDevice,
} from "./preview-geometry";
import {
  usePreviewLiveLink,
  type PreviewLiveValues,
} from "./use-preview-live-link";

/** A load that has not finished by then is reported as failed. */
export const PREVIEW_LOAD_TIMEOUT_MS = 20_000;

interface Frame {
  key: number;
  src: string;
  /** Has loaded; until then it waits out of sight. */
  ready: boolean;
}

/** The room the page has beside the preview, when it fits a phone frame. */
const HEIGHT_MARGIN = 260;
const MIN_FIT_HEIGHT = 320;

function useStageSpace(
  ref: RefObject<HTMLElement | null>,
  fit: "width" | "box",
) {
  const [space, setSpace] = useState({ width: 0, maxHeight: 0 });
  const measure = useCallback(() => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const maxHeight =
      fit === "box"
        ? box.height
        : Math.max(MIN_FIT_HEIGHT, window.innerHeight - HEIGHT_MARGIN);
    setSpace((previous) =>
      previous.width === box.width && previous.maxHeight === maxHeight
        ? previous
        : { width: box.width, maxHeight },
    );
  }, [ref, fit]);
  useLayoutEffect(() => {
    measure();
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref, measure]);
  return space;
}

function PreviewFrame({
  frame,
  shown,
  device,
  live,
  onLoad,
}: {
  frame: Frame;
  shown: boolean;
  device: PreviewDevice;
  live: PreviewLiveValues;
  onLoad: (key: number) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  usePreviewLiveLink(() => ref.current?.contentWindow, live);
  const size = PREVIEW_FRAME_SIZE[device];
  return (
    <iframe
      ref={ref}
      src={frame.src}
      title={m.personalize_preview_frame_title()}
      // A picture of the page, not a place to tab into; loading it takes no focus.
      tabIndex={-1}
      inert={!shown}
      data-shown={shown || undefined}
      className="personalize-frame"
      style={{ width: size.width, height: size.height }}
      onLoad={() => onLoad(frame.key)}
    />
  );
}

/**
 * The public page at `address` in an iframe, at the device's width and scaled
 * to fit. A new address loads in a second frame behind the first, which stays
 * in view until the new one has loaded, so the preview never flashes white.
 * The banner focus and the hue in `live` follow without a load.
 */
export function PreviewStage({
  address,
  device,
  fit,
  live,
}: {
  address: string;
  device: PreviewDevice;
  /** `width`: as tall as the scaled page. `box`: inside the space it is given. */
  fit: "width" | "box";
  live: PreviewLiveValues;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const space = useStageSpace(stageRef, fit);
  const scale = previewScale(device, space);
  const size = PREVIEW_FRAME_SIZE[device];

  const nextKey = useRef(2);
  const [frames, setFrames] = useState<Array<Frame>>(() => [
    { key: 1, src: address, ready: false },
  ]);
  const [failed, setFailed] = useState(false);

  const load = useCallback((src: string) => {
    const key = nextKey.current++;
    setFrames((previous) => {
      const shown = previous.filter((frame) => frame.ready).slice(-1);
      return [...shown, { key, src, ready: false }];
    });
    setFailed(false);
  }, []);

  const framesRef = useRef(frames);
  framesRef.current = frames;
  useEffect(() => {
    if (framesRef.current[framesRef.current.length - 1]?.src !== address) {
      load(address);
    }
  }, [address, load]);

  const loaded = useCallback((key: number) => {
    setFrames((previous) => {
      const index = previous.findIndex((frame) => frame.key === key);
      if (index < 0) return previous;
      return previous
        .slice(index)
        .map((frame) =>
          frame.key === key ? { ...frame, ready: true } : frame,
        );
    });
    setFailed(false);
  }, []);

  const pending = frames.find((frame) => !frame.ready);
  const showing = frames.some((frame) => frame.ready);
  const pendingKey = pending?.key;
  useEffect(() => {
    if (pendingKey === undefined) return;
    const timer = setTimeout(() => setFailed(true), PREVIEW_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [pendingKey]);

  const lastShown = frames.filter((frame) => frame.ready).slice(-1)[0];
  const loading = pending !== undefined && !failed;

  return (
    <div
      ref={stageRef}
      className="personalize-stage"
      data-fit={fit}
      data-loading={loading || undefined}
    >
      <div
        className="personalize-canvas"
        style={{
          width: size.width * scale,
          height: size.height * scale,
          visibility: scale > 0 ? undefined : "hidden",
        }}
      >
        <div
          className="personalize-scaler"
          style={{
            width: size.width,
            height: size.height,
            transform: `scale(${scale})`,
          }}
        >
          {frames.map((frame) => (
            <PreviewFrame
              key={frame.key}
              frame={frame}
              shown={frame.key === lastShown?.key}
              device={device}
              live={live}
              onLoad={loaded}
            />
          ))}
        </div>
      </div>
      {loading ? (
        <div
          role="status"
          className="personalize-loading"
          data-first={!showing || undefined}
        >
          <Spinner size={15} />
          {m.personalize_preview_loading()}
        </div>
      ) : null}
      {failed && pending ? (
        <Callout
          role="alert"
          tone="danger"
          icon={CircleAlert}
          className="personalize-failed"
          action={
            <Button size="sm" onClick={() => load(pending.src)}>
              {m.personalize_preview_retry()}
            </Button>
          }
        >
          {m.personalize_preview_failed()}
        </Callout>
      ) : null}
    </div>
  );
}
