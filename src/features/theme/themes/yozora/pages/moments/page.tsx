import { getLocale } from "@/paraglide/runtime";
import { MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import type { MomentItem } from "@/features/moments/moments.schema";
import type { MomentsPageProps } from "@/features/theme/contract/pages";
import { m } from "@/paraglide/messages";

type Filter = "all" | MomentItem["type"];

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatParts(value: Date | string | null | undefined, locale: string) {
  const date = toDate(value);
  if (!date) return null;
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: months[date.getMonth()] ?? "",
    year: String(date.getFullYear()),
    time: new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function MomentCard({ moment, index }: { moment: MomentItem; index: number }) {
  const locale = getLocale();
  const date = formatParts(moment.publishedAt, locale);
  const images = moment.images ?? [];
  const label =
    moment.type === "chatter" ? m.moments_type_chatter() : m.moments_type_moment();

  return (
    <li
      className="yz-moment fuwari-onload-animation"
      style={{ animationDelay: `${120 + index * 45}ms` }}
    >
      <div className="yz-moment__rail" aria-hidden="true">
        <span className="yz-moment__day">{date?.day ?? "·"}</span>
        <span className="yz-moment__month">{date?.month ?? ""}</span>
        <span className="yz-moment__year">{date?.year ?? ""}</span>
      </div>

      <article className="yz-moment__card">
        <header className="yz-moment__head">
          <span className={`yz-moment__type yz-moment__type--${moment.type}`}>
            {label}
          </span>
          {date ? (
            <time className="yz-moment__time" dateTime={toDate(moment.publishedAt)?.toISOString()}>
              {date.time}
            </time>
          ) : null}
          {moment.location ? (
            <span className="yz-moment__place">
              <MapPin size={12} strokeWidth={1.4} aria-hidden="true" />
              {moment.location}
            </span>
          ) : null}
        </header>

        <p className="yz-moment__text">{moment.content}</p>

        {images.length > 0 ? (
          <div
            className={`yz-moment__gallery yz-moment__gallery--${Math.min(images.length, 3)}`}
          >
            {images.map((src, imageIndex) => (
              <a
                key={`${src}-${imageIndex}`}
                href={src}
                target="_blank"
                rel="noreferrer"
                className="yz-moment__image"
                aria-label={`${label} ${imageIndex + 1}`}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </a>
            ))}
          </div>
        ) : null}
      </article>
    </li>
  );
}

export function MomentsPage({ moments }: MomentsPageProps) {
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () =>
      filter === "all"
        ? moments
        : moments.filter((moment) => moment.type === filter),
    [filter, moments],
  );

  const filters: Array<{ key: Filter; label: string }> = [
    { key: "all", label: m.moments_filter_all() },
    { key: "moment", label: m.moments_type_moment() },
    { key: "chatter", label: m.moments_type_chatter() },
  ];

  return (
    <div className="yz-moments fuwari-onload-animation">
      <div className="yz-shell">
        <header className="yz-book__head yz-moments__head">
          <div className="yz-hero__pagemark">
            <svg
              width="34"
              height="10"
              viewBox="0 0 34 10"
              fill="none"
              aria-hidden="true"
            >
              <path d="M1 5h12" stroke="currentColor" strokeWidth=".8" />
              <path
                d="M18 1.6c3.2 0 3.2 6.8 6.4 6.8s3.2-6.8 6.4-6.8"
                stroke="var(--yz-gold)"
                strokeWidth=".8"
                fill="none"
              />
            </svg>
            <span>Moments · 日々の断章</span>
          </div>
          <h1 className="yz-book__title">{m.moments_title()}</h1>
          <p className="yz-book__desc">{m.moments_desc()}</p>
        </header>

        <div className="yz-moments__bar">
          <nav
            className="yz-moments__filters"
            aria-label={m.moments_filter_label()}
          >
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={
                  filter === item.key
                    ? "yz-moments__filter yz-moments__filter--active"
                    : "yz-moments__filter"
                }
                aria-pressed={filter === item.key}
              >
                {filter === item.key ? `[ ${item.label} ]` : item.label}
              </button>
            ))}
          </nav>
          <span className="yz-moments__count">
            {m.moments_count({ count: visible.length })}
          </span>
        </div>

        {visible.length > 0 ? (
          <ol className="yz-moments__list">
            {visible.map((moment, index) => (
              <MomentCard
                key={moment.id}
                moment={moment}
                index={index}
              />
            ))}
          </ol>
        ) : (
          <div className="yz-moments__empty">
            <p className="yz-moments__empty-mark">· · ·</p>
            <p>{m.moments_empty()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MomentsPageSkeleton() {
  return (
    <div className="yz-moments">
      <div className="yz-shell">
        <div className="yz-moments__skeleton-head" />
        <div className="yz-moments__skeleton" />
        <div className="yz-moments__skeleton" />
      </div>
    </div>
  );
}
