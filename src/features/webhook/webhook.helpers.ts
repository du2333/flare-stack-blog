import type { NotificationEvent } from "@/features/notification/notification.schema";
import type { Locale } from "@/lib/i18n";
import { m } from "@/paraglide/messages";

export function createAdminRootExampleEvent(locale: Locale): NotificationEvent {
  return {
    type: "comment.admin_root_created",
    data: {
      postTitle: m.webhook_example_post_title({}, { locale }),
      commenterName: m.webhook_example_commenter_name({}, { locale }),
      commentPreview: m.webhook_example_comment_preview({}, { locale }),
      commentUrl: "https://example.com/post/welcome?comment=1",
    },
  };
}
