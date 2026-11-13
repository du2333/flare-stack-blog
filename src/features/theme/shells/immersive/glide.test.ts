// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Glider } from "./glide";

const TIMING = { duration: 560, easing: "ease" };

/** Where the layout has an element, which jsdom cannot tell. */
const boxes = new Map<Element, { left: number; top: number; width: number }>();
/** How wide an element's `::before` is drawn. */
const surfaces = new Map<Element, number>();

interface Played {
  target: Element;
  keyframes: Array<Record<string, string>>;
  pseudo?: string;
  cancelled: boolean;
  playState: string;
  finished: Array<() => void>;
}
let played: Array<Played>;
let frames: Array<{ id: number; callback: FrameRequestCallback }>;
let frameId: number;

function place(element: Element, left: number, top = 0, width = 40) {
  boxes.set(element, { left, top, width });
}

/** Runs the callbacks asked for so far, as one frame does. */
function frame() {
  const due = frames;
  frames = [];
  for (const { callback } of due) callback(0);
}

/** Plays every animation started so far to its end. */
function finish() {
  for (const animation of played) {
    if (animation.playState !== "running") continue;
    animation.playState = "finished";
    for (const listener of animation.finished) listener();
  }
}

/** A bar with a brand and, inside the brand, a mark. */
function bar() {
  document.body.innerHTML =
    '<div class="bar"><div class="brand"><i class="mark"></i></div><a class="search"></a></div>';
  const root = document.querySelector<HTMLElement>(".bar")!;
  const brand = root.querySelector<HTMLElement>(".brand")!;
  const mark = root.querySelector<HTMLElement>(".mark")!;
  const search = root.querySelector<HTMLElement>(".search")!;
  place(root, 100, 0, 1000);
  place(brand, 100);
  place(mark, 100);
  place(search, 900);
  surfaces.set(root, 1000);
  surfaces.set(search, 168);
  return { root, brand, mark, search };
}

beforeEach(() => {
  boxes.clear();
  surfaces.clear();
  played = [];
  frames = [];
  frameId = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frameId += 1;
    frames.push({ id: frameId, callback });
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    frames = frames.filter((frame) => frame.id !== id);
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const box = boxes.get(this) ?? { left: 0, top: 0, width: 0 };
      // What holds a part shows in where it is seen.
      const [x = 0, y = 0] = this.style.translate
        .split(" ")
        .map((length) => Number.parseFloat(length) || 0);
      return {
        left: box.left + x,
        top: box.top + y,
        width: box.width,
        height: box.width ? 40 : 0,
      } as DOMRect;
    },
  );
  const computed = window.getComputedStyle.bind(window);
  vi.stubGlobal("getComputedStyle", (element: Element, pseudo?: string) => {
    if (!pseudo) return computed(element);
    const held =
      Number.parseFloat(
        (element as HTMLElement).style.getPropertyValue("--glide-right"),
      ) || 0;
    return {
      width: `${(surfaces.get(element) ?? 0) - held}px`,
      height: "40px",
      marginRight: `${held}px`,
      marginBottom: "0px",
    };
  });
  HTMLElement.prototype.animate = function (
    this: HTMLElement,
    keyframes: Array<Record<string, string>>,
    options: KeyframeAnimationOptions,
  ) {
    const animation: Played = {
      target: this,
      keyframes,
      pseudo: options.pseudoElement ?? undefined,
      cancelled: false,
      playState: "running",
      finished: [],
    };
    played.push(animation);
    return {
      effect: { target: this, pseudoElement: options.pseudoElement ?? null },
      get playState() {
        return animation.playState;
      },
      cancel: () => {
        animation.cancelled = true;
        animation.playState = "idle";
      },
      addEventListener: (_type: string, listener: () => void) =>
        animation.finished.push(listener),
    } as unknown as Animation;
  } as typeof HTMLElement.prototype.animate;
});
afterEach(() => {
  // @ts-expect-error jsdom has none of its own
  delete HTMLElement.prototype.animate;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("a change of layout that glides", () => {
  it("is made at once while nothing is gliding", () => {
    const { root } = bar();
    const glider = new Glider(() => root, ".bar, .search", TIMING);
    const apply = vi.fn();

    glider.change(apply);

    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("holds each part where it was by its own style in the frame the layout changes in, and nothing is animated yet", () => {
    const { root, brand, search } = bar();
    const glider = new Glider(() => root, ".bar, .search", TIMING);

    glider.change(() => {
      // The pill: the bar closes in and everything in it moves.
      place(root, 400, 12, 400);
      place(brand, 406, 12);
      place(root.querySelector(".mark")!, 412, 12);
      place(search, 700, 12);
    });
    glider.carry();

    // The bar is back where it was, and carries what is in it that far:
    // the brand is 6 further in than it was, the field 500 short.
    expect(root.style.translate).toBe("-300px -12px");
    expect(brand.style.translate).toBe("-6px 0px");
    expect(search.style.translate).toBe("500px 0px");
    expect(played).toEqual([]);
  });

  it("gives a part inside a part that moved only what that one has not carried it", () => {
    const { root, brand, mark } = bar();
    const glider = new Glider(() => root, ".bar, .search", TIMING);

    glider.change(() => {
      place(root, 400);
      place(brand, 406);
      place(mark, 412);
    });
    glider.carry();

    // The bar carries 300 of each; the brand 6 more; the mark 6 beyond that.
    expect(brand.style.translate).toBe("-6px 0px");
    expect(mark.style.translate).toBe("-6px 0px");
  });

  it("leaves a part alone that is where it was", () => {
    const { root, brand } = bar();
    const glider = new Glider(() => root, ".bar, .search", TIMING);

    glider.change(() => place(root.querySelector(".search")!, 700));
    glider.carry();

    expect(root.style.translate).toBe("");
    expect(brand.style.translate).toBe("");
  });

  it("holds the surface of a part at the size it was drawn, and every other surface at its own", () => {
    const { root, search } = bar();
    const glider = new Glider(() => root, ".bar, .search", TIMING);

    glider.change(() => {
      place(root, 400, 0, 400);
      surfaces.set(root, 400);
    });
    glider.carry();

    expect(root.style.getPropertyValue("--glide-right")).toBe("-600px");
    // A custom property inherits: the field in the bar says its own.
    expect(search.style.getPropertyValue("--glide-right")).toBe("0px");
  });

  it("lets go of the styles for animations that ease out, once a frame has been painted with them", () => {
    const { root } = bar();
    const glider = new Glider(() => root, ".bar, .search", TIMING);

    glider.change(() => {
      place(root, 400, 0, 400);
      surfaces.set(root, 400);
    });
    glider.carry();
    frame();
    expect(played).toEqual([]);
    expect(root.style.translate).toBe("-300px 0px");

    frame();
    expect(
      played
        .filter(({ target }) => target === root)
        .map(({ pseudo, keyframes }) => [pseudo, keyframes]),
    ).toEqual([
      [undefined, [{ translate: "-300px 0px" }, { translate: "0px 0px" }]],
      [
        "::before",
        [
          { marginRight: "-600px", marginBottom: "0px" },
          { marginRight: "0px", marginBottom: "0px" },
        ],
      ],
    ]);
    expect(root.style.translate).toBe("");
    expect(root.style.getPropertyValue("--glide-right")).toBe("");
  });

  it("stops what is still gliding where it is, as styles, and makes the next change a frame later, from there", () => {
    const { root } = bar();
    const glider = new Glider(() => root, ".bar, .search", TIMING);
    glider.change(() => place(root, 400));
    glider.carry();
    frame();
    frame();
    const apply = vi.fn(() => place(root, 100));
    // Half way: the animation has the bar 150px short of its place.
    const computed = window.getComputedStyle;
    vi.stubGlobal("getComputedStyle", (element: Element, pseudo?: string) =>
      pseudo || element !== root
        ? computed(element, pseudo)
        : { translate: "-150px 0px" },
    );

    glider.change(apply);

    expect(apply).not.toHaveBeenCalled();
    expect(played[0]!.cancelled).toBe(true);
    expect(root.style.translate).toBe("-150px 0px");

    frame();
    expect(apply).toHaveBeenCalledTimes(1);
    glider.carry();
    // From 250 (400 less the 150 it was short) back to 100.
    expect(root.style.translate).toBe("150px 0px");
  });

  it("makes the change at once and ends whatever glides for a reader who asked for less motion", () => {
    const { root } = bar();
    const glider = new Glider(() => root, ".bar, .search", TIMING);
    glider.change(() => place(root, 400));
    glider.carry();
    const apply = vi.fn();

    glider.change(apply, false);
    glider.carry();

    expect(apply).toHaveBeenCalledTimes(1);
    expect(root.style.translate).toBe("");
    frame();
    frame();
    expect(played).toEqual([]);
  });

  it("carries nothing for a measure no change of layout followed", () => {
    const { root } = bar();
    const glider = new Glider(() => root, ".bar, .search", TIMING);
    const now = vi.spyOn(performance, "now").mockReturnValue(1000);
    glider.change(() => {});

    now.mockReturnValue(2000);
    place(root, 400);
    glider.carry();

    expect(root.style.translate).toBe("");
  });
});

describe("what is told of the glide", () => {
  it("is that the parts glide from the change until the last animation has finished", () => {
    const { root } = bar();
    const gliding = vi.fn();
    const glider = new Glider(() => root, ".bar, .search", TIMING, gliding);

    glider.change(() => {
      place(root, 400, 0, 400);
      surfaces.set(root, 400);
    });
    expect(gliding.mock.calls).toEqual([[true]]);
    glider.carry();
    frame();
    frame();
    // Animating now, and still gliding until they have played.
    expect(played.length).toBeGreaterThan(0);
    expect(gliding.mock.calls).toEqual([[true]]);

    finish();
    expect(gliding.mock.calls).toEqual([[true], [false]]);
  });

  it("is over at once for a change that moved nothing", () => {
    const { root } = bar();
    const gliding = vi.fn();
    const glider = new Glider(() => root, ".bar, .search", TIMING, gliding);

    glider.change(() => {});
    glider.carry();

    expect(gliding.mock.calls).toEqual([[true], [false]]);
  });

  it("goes on through a change made while the parts still glide", () => {
    const { root } = bar();
    const gliding = vi.fn();
    const glider = new Glider(() => root, ".bar, .search", TIMING, gliding);
    glider.change(() => place(root, 400));
    glider.carry();
    frame();
    frame();

    glider.change(() => place(root, 100));
    frame();
    glider.carry();
    frame();
    frame();
    expect(gliding.mock.calls).toEqual([[true]]);

    finish();
    expect(gliding.mock.calls).toEqual([[true], [false]]);
  });

  it("is over when the glide is ended, and nothing is started after", () => {
    const { root } = bar();
    const gliding = vi.fn();
    const glider = new Glider(() => root, ".bar, .search", TIMING, gliding);
    glider.change(() => place(root, 400));
    glider.carry();

    glider.end();
    frame();
    frame();

    expect(gliding.mock.calls).toEqual([[true], [false]]);
    expect(played).toEqual([]);
  });
});
