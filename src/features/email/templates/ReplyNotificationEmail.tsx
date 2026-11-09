import type { CommentNotificationTarget } from "@/features/notification/notification.schema";
import type { Locale } from "@/lib/i18n";
import { m } from "@/paraglide/messages";
import {
  EmailButton,
  EmailDivider,
  EmailHeading,
  EmailLayout,
  EmailLink,
  EmailNote,
  EmailPanel,
  EmailText,
} from "./EmailLayout";
import type { EmailSite } from "./email-theme";

interface ReplyNotificationEmailProps {
  commentUrl: string;
  locale: Locale;
  postTitle: string;
  replierName: string;
  replyPreview: string;
  site: EmailSite;
  /** A Moment's Comment names the Moment by `postTitle`, the start of its text. */
  target?: CommentNotificationTarget;
  unsubscribeUrl: string;
}

export const ReplyNotificationEmail = ({
  commentUrl,
  locale,
  postTitle,
  replierName,
  replyPreview,
  site,
  target,
  unsubscribeUrl,
}: ReplyNotificationEmailProps) => {
  return (
    <EmailLayout
      locale={locale}
      site={site}
      previewText={
        target === "moment"
          ? m.email_comment_reply_moment_preview(
              { replierName, momentTitle: postTitle },
              { locale },
            )
          : m.email_comment_reply_preview(
              { replierName, postTitle },
              { locale },
            )
      }
    >
      <EmailHeading>{m.email_comment_reply_title({}, { locale })}</EmailHeading>
      <EmailText>
        {m.email_comment_reply_intro({ replierName }, { locale })}
      </EmailText>
      <EmailPanel>{replyPreview}</EmailPanel>
      <EmailButton href={commentUrl}>
        {m.email_comment_reply_action({}, { locale })}
      </EmailButton>
      <EmailDivider />
      <EmailNote>
        {m.email_comment_reply_unsubscribe_hint({}, { locale })}{" "}
        <EmailLink href={unsubscribeUrl}>
          {m.email_comment_reply_unsubscribe_action({}, { locale })}
        </EmailLink>
      </EmailNote>
    </EmailLayout>
  );
};
