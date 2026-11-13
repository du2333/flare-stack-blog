import type { Flow, FlowContext } from "./context.ts";
import { POST_LINK, settle } from "./helpers.ts";

/** What the page-side sampler writes every 50 ms. */
interface Sample {
  /** Milliseconds since the click. */
  t: number;
  path: string;
  skeleton: boolean;
  /** Nothing to look at: no skeleton, and no text on the page or in the Admin's stage. */
  blank: boolean;
  /** On the destination, no skeleton, and its content is there. */
  settled: boolean;
}

interface Route {
  label: string;
  signedIn: boolean;
  from: string;
  /** The link to click, as a CSS selector (the first visible one). */
  link: string;
  /** The destination's path (a prefix) and a selector for its content. */
  to: string;
  content: string;
}

const ROUTES: Array<Route> = [
  {
    label: "home-to-post",
    signedIn: false,
    from: "/",
    link: POST_LINK,
    to: "/post/",
    content: ".fuwari-custom-md",
  },
  {
    label: "admin-to-posts",
    signedIn: true,
    from: "/admin",
    link: 'a[href="/admin/posts"]',
    to: "/admin/posts",
    content: ".admin-stage",
  },
  {
    label: "admin-to-media",
    signedIn: true,
    from: "/admin",
    link: 'a[href="/admin/media"]',
    to: "/admin/media",
    content: ".admin-stage",
  },
];

const SKELETON = ".animate-pulse, .fuwari-skeleton-shimmer";
const SETTLE_AFTER_MS = 1500;
const GIVE_UP_MS = 45_000;

async function navigate(ctx: FlowContext, route: Route) {
  const tab = await ctx.open({ signedIn: route.signedIn });
  const { page } = tab;
  await page.goto(ctx.url(route.from), { waitUntil: "load" });
  await settle(page, 4000);
  await tab.throttle();
  await page.evaluate(
    ([skeleton, to, content]) => {
      const samples: Array<Sample> = [];
      const clicked = performance.now();
      (window as unknown as { __flowSamples: Array<Sample> }).__flowSamples =
        samples;
      setInterval(() => {
        const path = location.pathname;
        const isSkeleton = document.querySelector(skeleton!) !== null;
        const bodyText = document.body.innerText.trim().length;
        const stage = document.querySelector(".admin-stage");
        const blank =
          !isSkeleton &&
          (bodyText < 10 ||
            (path.startsWith("/admin") &&
              stage !== null &&
              stage.textContent!.trim() === ""));
        const target = document.querySelector(content!);
        samples.push({
          t: Math.round(performance.now() - clicked),
          path,
          skeleton: isSkeleton,
          blank,
          settled:
            path.startsWith(to!) &&
            !isSkeleton &&
            (target?.textContent?.trim().length ?? 0) > 20,
        });
      }, 50);
    },
    [SKELETON, route.to, route.content] as const,
  );
  await page.locator(route.link).first().click({ noWaitAfter: true });

  const read = () =>
    page.evaluate(
      () =>
        (window as unknown as { __flowSamples: Array<Sample> }).__flowSamples,
    );
  const started = Date.now();
  let samples = await read();
  const quiet = SETTLE_AFTER_MS / 50;
  const done = (list: Array<Sample>) =>
    list.length >= quiet &&
    list.slice(-quiet).every((sample) => sample.settled);
  while (!done(samples) && Date.now() - started < GIVE_UP_MS) {
    await page.waitForTimeout(500);
    samples = await read();
  }
  return { samples, settled: done(samples) };
}

function report(
  ctx: FlowContext,
  route: Route,
  samples: Array<Sample>,
  settled: boolean,
) {
  const skeleton = samples.find((sample) => sample.skeleton);
  // The moment from which the destination stayed settled to the end.
  let lastUnsettled = samples.length - 1;
  while (lastUnsettled >= 0 && samples[lastUnsettled]!.settled) lastUnsettled--;
  const settledAt = settled ? samples[lastUnsettled + 1] : undefined;
  const blanks = samples.filter((sample) => sample.blank);
  const label = route.label;
  // Timings end in Ms (compared with a tolerance); a blank screen is told only when it happened.
  ctx.observe(`${label}:skeletonMs`, skeleton?.t ?? "never");
  ctx.observe(`${label}:settledMs`, settledAt?.t ?? "never");
  if (blanks.length) ctx.observe(`${label}:blankSamples`, blanks.length);

  ctx.check(
    settled,
    `${label}: the destination did not settle within ${GIVE_UP_MS / 1000} s; last sample ${JSON.stringify(samples.at(-1))}`,
  );
  ctx.check(
    blanks.length === 0,
    `${label}: the screen was blank in ${blanks.length} samples, first at ${blanks[0]?.t} ms`,
  );
  ctx.check(
    skeleton !== undefined && (!settledAt || skeleton.t <= settledAt.t),
    `${label}: no skeleton before the content`,
  );
}

export const throttledNavigation: Flow = {
  name: "throttled-navigation",
  summary:
    "on a slow network (400 ms latency, 400 KB/s), clicking without hovering: home to a Post, /admin to /admin/posts and to /admin/media show a skeleton, never a blank screen, then the content",
  timeoutMs: 240_000,
  async run(ctx) {
    if (!ctx.canSignIn) {
      ctx.observe(
        "admin routes",
        "skipped (needs --session or --api-key-file)",
      );
    }
    for (const route of ROUTES.filter((r) => ctx.canSignIn || !r.signedIn)) {
      const { samples, settled } = await navigate(ctx, route);
      report(ctx, route, samples, settled);
    }
  },
};
