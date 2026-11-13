/**
 * Lets what an element holds glide from where it was to where a change of
 * layout has put it. The layout changes at once; each part that moved is
 * then held where it was with a `translate` that eases out, and nothing is
 * laid out again while it plays. A browser counts a part that moves in the
 * layout as layout shift, and one that a transform moves as none.
 *
 * A part that paints a surface (its `::before`) also changes size: the far
 * edges of the surface ease from the size it had, so a wide bar closes in to
 * a pill from both sides instead of jumping to it. Such a `::before` takes
 * its right and bottom margins from `--glide-right` and `--glide-bottom`
 * (navbar.css).
 *
 * The frame the layout changes in must show every part exactly where the
 * frame before showed it, and by plain styles: a browser does not count an
 * animation that has yet to begin as having moved a part back. So a change
 * is made in three steps:
 *
 *   1. `change`: what is still gliding is stopped where it is, as styles,
 *      and a frame later the parts are measured and the change is made;
 *   2. `carry`, once the new layout is there and before it is painted: each
 *      part is put back where it was measured, as styles;
 *   3. a frame after that the styles become animations that ease out.
 */

export interface GlideTiming {
  duration: number;
  easing: string;
}

/** Where the parts are, as the reader sees them, and how large each surface is drawn. */
interface Places {
  at: number;
  boxes: Map<Element, DOMRect>;
  surfaces: Map<HTMLElement, { width: number; height: number }>;
}

/** Icons move as one: what is inside an `svg` is not a part. */
const PARTS = "*:not(svg *)";
/** A change that has not been laid out by then was none; its measure is dropped. */
const STALE_MS = 250;
const RIGHT = "--glide-right";
const BOTTOM = "--glide-bottom";

function surfaceSize(element: Element) {
  const style = getComputedStyle(element, "::before");
  return {
    width: Number.parseFloat(style.width) || 0,
    height: Number.parseFloat(style.height) || 0,
  };
}

export class Glider {
  /** Measured before a change that has yet to be carried. */
  private from: Places | null = null;
  /** Changes waiting for the frame in which they can be measured. */
  private waiting: Array<() => void> = [];
  private waitingFrame = 0;
  /** Parts held by styles, to become animations a frame on. */
  private held = new Map<HTMLElement, { translate?: string; surface?: true }>();
  private startFrame = 0;
  private animations: Array<Animation> = [];

  /** Whether a change that glides has been made and its parts are not yet still. */
  private gliding = false;

  constructor(
    private readonly root: () => HTMLElement | null,
    /** Matches the parts whose `::before` is their surface. */
    private readonly surfaces: string,
    private readonly timing: GlideTiming,
    /**
     * Told when the parts start to glide (as a change that glides is made)
     * and when they are all still again: the animations have finished or
     * were ended, or the change moved nothing.
     */
    private readonly onGliding?: (gliding: boolean) => void,
  ) {}

  private setGliding(gliding: boolean) {
    if (gliding === this.gliding) return;
    this.gliding = gliding;
    this.onGliding?.(gliding);
  }

  /**
   * Makes a change of layout that the parts are to glide through. `apply`
   * runs now, or a frame on while something is still gliding. With `glide`
   * false the change is made at once and whatever glides ends.
   */
  change(apply: () => void, glide = true) {
    const root = this.root();
    if (!glide || !root || typeof root.animate !== "function") {
      this.end();
      apply();
      return;
    }
    this.waiting.push(apply);
    if (this.waitingFrame) return;
    if (this.freeze()) {
      this.waitingFrame = requestAnimationFrame(() => this.measureAndApply());
    } else {
      this.measureAndApply();
    }
  }

  /** After the change is laid out, before it is painted. */
  carry() {
    const root = this.root();
    const from = this.from;
    this.from = null;
    if (!from) return;
    if (!root || performance.now() - from.at > STALE_MS) {
      if (this.animations.length === 0) this.setGliding(false);
      return;
    }
    this.release();

    // How much larger each surface was drawn; measured before any is held,
    // and every one is held, at nothing if need be: a surface inside another
    // would inherit what holds that one.
    for (const [part, was] of from.surfaces) {
      if (!root.contains(part)) from.surfaces.delete(part);
      else {
        const now = surfaceSize(part);
        was.width -= now.width;
        was.height -= now.height;
      }
    }
    for (const [part, larger] of from.surfaces) {
      const changed =
        Math.abs(larger.width) >= 0.5 || Math.abs(larger.height) >= 0.5;
      part.style.setProperty(RIGHT, changed ? `${-larger.width}px` : "0px");
      part.style.setProperty(BOTTOM, changed ? `${-larger.height}px` : "0px");
      this.held.set(part, changed ? { surface: true } : {});
    }

    // How far each part is from where it was, on the page.
    const moved = new Map<Element, { x: number; y: number }>();
    for (const [part, was] of from.boxes) {
      if (!root.contains(part)) continue;
      const now = part.getBoundingClientRect();
      // Not shown before or not shown now: nothing to carry.
      if (was.width + was.height === 0 || now.width + now.height === 0) {
        continue;
      }
      moved.set(part, { x: was.left - now.left, y: was.top - now.top });
    }
    for (const [part, offset] of moved) {
      if (!(part instanceof HTMLElement)) continue;
      // A part moves with the part it is in; it is given what is left.
      let carrier = part === root ? null : part.parentElement;
      while (carrier && !moved.has(carrier)) {
        carrier = carrier === root ? null : carrier.parentElement;
      }
      const carried = carrier ? moved.get(carrier)! : { x: 0, y: 0 };
      const x = offset.x - carried.x;
      const y = offset.y - carried.y;
      if (Math.abs(x) >= 0.5 || Math.abs(y) >= 0.5) {
        const translate = `${x}px ${y}px`;
        part.style.translate = translate;
        this.held.set(part, { ...this.held.get(part), translate });
      }
    }
    if (
      ![...this.held.values()].some((hold) => hold.translate || hold.surface)
    ) {
      this.release();
      this.setGliding(false);
      return;
    }
    // Two frames on, so one has been painted with the styles in place
    // wherever in a frame this was called.
    this.startFrame = requestAnimationFrame(() => {
      this.startFrame = requestAnimationFrame(() => this.start());
    });
  }

  /** Ends everything where the layout has its parts. */
  end() {
    cancelAnimationFrame(this.waitingFrame);
    this.waitingFrame = 0;
    this.from = null;
    const waiting = this.waiting;
    this.waiting = [];
    for (const animation of this.animations) animation.cancel();
    this.animations = [];
    this.release();
    this.setGliding(false);
    for (const apply of waiting) apply();
  }

  private measureAndApply() {
    this.waitingFrame = 0;
    const root = this.root();
    if (root) {
      this.setGliding(true);
      const parts = [root, ...root.querySelectorAll(PARTS)];
      this.from = {
        at: performance.now(),
        boxes: new Map(
          parts.map((part) => [part, part.getBoundingClientRect()]),
        ),
        surfaces: new Map(
          parts
            .filter(
              (part): part is HTMLElement =>
                part instanceof HTMLElement && part.matches(this.surfaces),
            )
            .map((part) => [part, surfaceSize(part)]),
        ),
      };
    }
    const waiting = this.waiting;
    this.waiting = [];
    for (const apply of waiting) apply();
  }

  /** Lets go of the parts held by styles. */
  private release() {
    cancelAnimationFrame(this.startFrame);
    this.startFrame = 0;
    for (const part of this.held.keys()) {
      part.style.translate = "";
      part.style.removeProperty(RIGHT);
      part.style.removeProperty(BOTTOM);
    }
    this.held.clear();
  }

  /** The styles that hold the parts become animations that ease out. */
  private start() {
    this.startFrame = 0;
    for (const [part, { translate, surface }] of this.held) {
      if (translate) {
        this.animations.push(
          part.animate([{ translate }, { translate: "0px 0px" }], this.timing),
        );
      }
      if (surface) {
        this.animations.push(
          part.animate(
            [
              {
                marginRight: part.style.getPropertyValue(RIGHT),
                marginBottom: part.style.getPropertyValue(BOTTOM),
              },
              { marginRight: "0px", marginBottom: "0px" },
            ],
            { ...this.timing, pseudoElement: "::before" },
          ),
        );
      }
    }
    for (const animation of this.animations) {
      animation.addEventListener("finish", () => {
        this.animations = this.animations.filter((one) => one !== animation);
        if (this.animations.length === 0) this.setGliding(false);
      });
    }
    this.release();
    if (this.animations.length === 0) this.setGliding(false);
  }

  /**
   * Stops what is gliding where it is, as styles. Returns whether anything
   * was: the styles must be painted once before the parts are measured.
   */
  private freeze() {
    const running = this.animations.filter(
      (animation) => animation.playState === "running",
    );
    this.animations = [];
    if (running.length === 0) return false;
    // Read everything before anything is written: a surface inside another
    // inherits what holds that one.
    const stops = running.map((animation) => {
      const effect = animation.effect as KeyframeEffect | null;
      const part = effect?.target;
      if (!(part instanceof HTMLElement)) return null;
      if (!effect?.pseudoElement) {
        return { part, translate: getComputedStyle(part).translate };
      }
      const style = getComputedStyle(part, "::before");
      return { part, right: style.marginRight, bottom: style.marginBottom };
    });
    const root = this.root();
    if (root) {
      for (const part of [root, ...root.querySelectorAll(this.surfaces)]) {
        if (!(part instanceof HTMLElement) || !part.matches(this.surfaces)) {
          continue;
        }
        part.style.setProperty(RIGHT, "0px");
        part.style.setProperty(BOTTOM, "0px");
        this.held.set(part, {});
      }
    }
    for (const stop of stops) {
      if (!stop) continue;
      if (stop.translate !== undefined)
        stop.part.style.translate = stop.translate;
      else {
        stop.part.style.setProperty(RIGHT, stop.right!);
        stop.part.style.setProperty(BOTTOM, stop.bottom!);
      }
      this.held.set(stop.part, {});
    }
    for (const animation of running) animation.cancel();
    return true;
  }
}
