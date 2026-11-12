import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

export const isSSR = typeof window === "undefined";

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  date: Date | undefined | null | string | number,
  options: { includeTime?: boolean } = {},
) {
  if (!date) return "";
  const d = new Date(date);
  if (options.includeTime) {
    return m.format_datetime({ date: d });
  }
  return m.format_date({ date: d });
}

export function formatMonthDayTime(
  date: Date | undefined | null | string | number,
) {
  if (!date) return "";
  return m.format_month_day_time({ date: new Date(date) });
}

export function formatTimeAgo(date: Date | null | string) {
  if (!date) return "";
  const now = new Date();
  const diffInSeconds = Math.floor(
    (now.getTime() - new Date(date).getTime()) / 1000,
  );

  if (diffInSeconds < 60) return m.time_ago_just_now();
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return m.time_ago_minutes({ count: diffInMinutes });
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return m.time_ago_hours({ count: diffInHours });
  const diffInDays = Math.floor(diffInHours / 24);
  return m.time_ago_days({ count: diffInDays });
}

/** A whole number with the locale's thousands separators. */
export function formatCount(value: number) {
  return new Intl.NumberFormat(getLocale() === "zh" ? "zh-CN" : "en-US").format(
    value,
  );
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}
