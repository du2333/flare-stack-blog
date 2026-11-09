import { momentTextTitle } from "@/features/moments/utils/moment-text";
import { m } from "@/paraglide/messages";
import type { Locale } from "@/paraglide/runtime";

/**
 * What names a Moment where a Post would show its title, such as comment
 * notifications and the Admin's reply queue: its first words, as its feed
 * entries' titles (`momentTextTitle`), or, with no text, what it holds, as
 * its page names it. `locale` defaults to the request's.
 */
export function momentHeading(
  moment: { text: string; hasVideo: boolean },
  locale?: Locale,
) {
  const options = locale ? { locale } : undefined;
  return (
    momentTextTitle(moment.text) ??
    (moment.hasVideo
      ? m.moments_video_only({}, options)
      : m.moments_image_only({}, options))
  );
}
