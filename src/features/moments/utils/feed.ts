import * as MomentRepo from "@/features/moments/data/moments.data";
import { renderMomentFeedHtml } from "@/features/moments/utils/feed-html";
import { momentTextTitle } from "@/features/moments/utils/moment-text";
import { toPublicMoment } from "@/features/moments/utils/public-moment";
import {
  cdataField,
  finishXml,
  htmlFromText,
} from "@/features/posts/utils/feed-xml";
import { createFeed, type FeedFlavor } from "@/features/posts/utils/feed";
import { getDb } from "@/lib/db";
import { m } from "@/paraglide/messages";
import { baseLocale, type Locale } from "@/paraglide/runtime";

// The feeds are cached by path only, so they cannot follow the request locale:
// they are always written in the site's base locale.
const FEED_LOCALE: { locale: Locale } = { locale: baseLocale as Locale };

// As many entries as the Post feeds.
const FEED_ITEMS = 100;

/**
 * A Moment has no title: its first words stand in, or, with no text, what it
 * holds and the day it was posted.
 */
function titleOf(moment: { text: string; video: unknown; postedAt: Date }) {
  const fromText = momentTextTitle(moment.text);
  if (fromText !== null) return fromText;
  const date = moment.postedAt.toISOString().slice(0, 10);
  return moment.video
    ? m.moments_feed_video_item_title({ date }, FEED_LOCALE)
    : m.moments_feed_images_item_title({ date }, FEED_LOCALE);
}

/** The Moments feed in one format, built as the Post feed is (`feed.ts`). */
async function buildFeed(
  env: Env,
  executionCtx: ExecutionContext,
  flavor: FeedFlavor,
) {
  const moments = (
    await MomentRepo.findMoments(getDb(env), { limit: FEED_ITEMS })
  ).map(toPublicMoment);

  const updated = moments.reduce<Date | undefined>(
    (latest, moment) =>
      !latest || moment.updatedAt > latest ? moment.updatedAt : latest,
    undefined,
  );

  const { feed, feedAuthor, origin } = await createFeed(
    env,
    executionCtx,
    flavor,
    {
      updated,
      titleSuffix: m.moments_feed_title({}, FEED_LOCALE),
      path: "/moments",
    },
  );

  for (const moment of moments) {
    const title = titleOf(moment);
    const html = renderMomentFeedHtml(moment, origin);
    const address = `${origin}/moments/${moment.id}`;
    feed.addItem({
      id: address,
      link: address,
      ...(flavor === "json"
        ? { title, content: html }
        : {
            title: cdataField(flavor === "atom" ? htmlFromText(title) : title),
            content: cdataField(html),
          }),
      author: [feedAuthor],
      date: moment.updatedAt,
      published: moment.postedAt,
    });
  }

  return feed;
}

export async function buildMomentsFeedJson(
  env: Env,
  executionCtx: ExecutionContext,
) {
  return (await buildFeed(env, executionCtx, "json")).json1();
}

export async function buildMomentsRssXml(
  env: Env,
  executionCtx: ExecutionContext,
) {
  return finishXml((await buildFeed(env, executionCtx, "rss")).rss2());
}

export async function buildMomentsAtomXml(
  env: Env,
  executionCtx: ExecutionContext,
) {
  return finishXml((await buildFeed(env, executionCtx, "atom")).atom1());
}
