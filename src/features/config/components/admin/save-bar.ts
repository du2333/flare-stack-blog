/**
 * The save bar is there to be acted on: it shows while a section has unsaved
 * changes, while a save is running (the form can turn clean before the
 * request ends), and while a save conflict is unresolved.
 */
export function isSaveBarVisible(state: {
  dirty?: boolean;
  busy: boolean;
  conflict?: boolean;
}) {
  return Boolean(state.dirty || state.busy || state.conflict);
}

/**
 * How many settings changed, from react-hook-form's dirty fields: a field is
 * one setting, and so is a whole list (links, navigation) however many of its
 * entries changed.
 */
export function countChangedSettings(dirty: unknown): number {
  if (dirty === true) return 1;
  if (Array.isArray(dirty)) return dirty.some(hasChange) ? 1 : 0;
  if (dirty === null || typeof dirty !== "object") return 0;
  return Object.values(dirty).reduce<number>(
    (sum, value) => sum + countChangedSettings(value),
    0,
  );
}

type DirtyOf = Record<string, unknown> | undefined;

/**
 * How many settings changed on 「设置 / 通知」, counted as the page shows
 * them: each switch, the email account (its fields and the cleared password
 * are one row) and each row of the Webhook endpoint. Choosing another Webhook
 * provider rewrites the rows behind it (secret, address, template), so the
 * endpoint is one change from then on.
 */
export function countChangedNotificationSettings(dirty: {
  email?: unknown;
  notification?: unknown;
  clearEmailPassword?: unknown;
  clearWebhookSecret?: unknown;
}): number {
  const notification = dirty.notification as DirtyOf;
  const channels = (notification?.admin as DirtyOf)?.channels as DirtyOf;
  const user = notification?.user as DirtyOf;
  const webhook = notification?.webhook as DirtyOf;
  const rows = [
    hasChange(dirty.email) || hasChange(dirty.clearEmailPassword),
    hasChange(channels?.email),
    hasChange(user?.emailEnabled),
    ...(hasChange(webhook?.provider)
      ? [true]
      : [
          hasChange(webhook?.url),
          hasChange(webhook?.chatId),
          hasChange(webhook?.template),
          hasChange(webhook?.secret) || hasChange(dirty.clearWebhookSecret),
        ]),
  ];
  return rows.filter(Boolean).length;
}

function hasChange(dirty: unknown): boolean {
  if (dirty === true) return true;
  if (Array.isArray(dirty)) return dirty.some(hasChange);
  if (dirty === null || typeof dirty !== "object") return false;
  return Object.values(dirty).some(hasChange);
}
