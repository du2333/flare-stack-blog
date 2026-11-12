import { CircleAlert } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Spinner } from "@/components/ui/spinner";
import { m } from "@/paraglide/messages";
import { publicPreviewPath } from "./preview-address";
import { previewFrameLayout, type PreviewDevice } from "./preview-geometry";
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

function useStageSpace(ref: RefObject<HTMLElement | null>) {
  const [space, setSpace] = useState({ width: 0, height: 0 });
  const measure = useCallback(() => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setSpace((previous) =>
      previous.width === box.width && previous.height === box.height
        ? previous
        : { width: box.width, height: box.height },
    );
  }, [ref]);
  useLayoutEffect(() => {
    measure();
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, measure]);
  return space;
}

function PreviewFrame({
  frame,
  shown,
  size,
  live,
  onLoad,
  register,
}: {
  frame: Frame;
  shown: boolean;
  size: { width: number; height: number };
  live: PreviewLiveValues;
  onLoad: (key: number) => void;
  register: (key: number, element: HTMLIFrameElement | null) => void;
}) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  usePreviewLiveLink(() => ref.current?.contentWindow, live);
  return (
    <iframe
      ref={(element) => {
        ref.current = element;
        register(frame.key, element);
      }}
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
 * The public page at `address` in an iframe, at the device's width, scaled to
 * the width of the space and as tall as the space (`previewFrameLayout`). A new address loads in a second frame behind the first, which stays
 * in view until the new one has loaded, so the preview never flashes white.
 * The banner focus and the hue in `live` follow without a load.
 */
export function PreviewStage({
  address,
  device,
  live,
  readPath,
}: {
  address: string;
  device: PreviewDevice;
  live: PreviewLiveValues;
  /** Set to a function that reads the path of the page in view, for the next address. */
  readPath: MutableRefObject<() => string | null>;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const space = useStageSpace(stageRef);
  const { scale, frame: size, canvas } = previewFrameLayout(device, space);

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
  const elements = useRef(new Map<number, HTMLIFrameElement>());
  const register = useCallback(
    (key: number, element: HTMLIFrameElement | null) => {
      if (element) elements.current.set(key, element);
      else elements.current.delete(key);
    },
    [],
  );
  useEffect(() => {
    // The page the Admin has clicked through to, so a reload stays on it.
    readPath.current = () => {
      const inView = framesRef.current
        .filter((frame) => frame.ready)
        .slice(-1)[0];
      const element = inView && elements.current.get(inView.key);
      try {
        return publicPreviewPath(element?.contentWindow?.location.pathname);
      } catch {
        return null;
      }
    };
  }, [readPath]);
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
    <div className="personalize-stage" data-loading={loading || undefined}>
      {/* What the device's viewport is scaled to fit: the stage less its margin. */}
      <div ref={stageRef} className="personalize-fit">
        <div
          className="personalize-canvas"
          data-device={device}
          style={{
            width: canvas.width,
            height: canvas.height,
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
                size={size}
                live={live}
                onLoad={loaded}
                register={register}
              />
            ))}
          </div>
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
