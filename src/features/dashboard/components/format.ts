import { getLocale } from "@/paraglide/runtime";

function intlLocale() {
  return getLocale() === "zh" ? "zh-CN" : "en-US";
}

export { formatCount } from "@/lib/utils";

/** A popularity window's first to last UTC day, e.g. "Sep 14 – Oct 13". */
export function formatWindow(start: number, end: number) {
  return new Intl.DateTimeFormat(intlLocale(), {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).formatRange(new Date(start), new Date(end));
}

/** Today's date with its weekday, e.g. "10月14日星期三". */
export function formatToday(date: Date) {
  return new Intl.DateTimeFormat(intlLocale(), {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

/** A calendar day, e.g. "2026年10月14日". */
export function formatDay(date: Date) {
  return new Intl.DateTimeFormat(intlLocale(), {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** A local day's weekday in one character or letter, e.g. "四" or "T". */
export function formatWeekdayNarrow(date: Date) {
  return new Intl.DateTimeFormat(intlLocale(), { weekday: "narrow" }).format(
    date,
  );
}

/** A UTC day as month and day, e.g. "10/14" or "10/14". */
export function formatUtcDay(day: number) {
  return new Intl.DateTimeFormat(intlLocale(), {
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  }).format(day);
}

/** A UTC day with its weekday, e.g. "10月14日周三" or "Wed, Oct 14". */
export function formatUtcDayLong(day: number) {
  return new Intl.DateTimeFormat(intlLocale(), {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(day);
}

/** A month label, e.g. "10月" or "Oct". */
export function formatMonth(date: Date) {
  return new Intl.DateTimeFormat(intlLocale(), { month: "short" }).format(date);
}
