import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { FloatingPopover } from "@/components/ui/floating-popover";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import "./field.css";

interface DatePickerProps {
  /** UTC calendar dates in YYYY-MM-DD format. */
  value: string;
  onChange: (date: string) => void;
  today?: string;
  maxDate?: string;
  className?: string;
  id?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  id,
  value,
  onChange,
  today,
  maxDate,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const todayDate = today ?? new Date().toISOString().slice(0, 10);
  const activeDate = value || todayDate;
  const [viewDate, setViewDate] = useState(
    () => new Date(`${activeDate}T00:00:00Z`),
  );
  const locale = getLocale();
  const localeTag = locale === "zh" ? "zh-CN" : "en-US";

  useEffect(() => {
    setViewDate(new Date(`${activeDate}T00:00:00Z`));
  }, [activeDate]);

  const daysOfWeek = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(localeTag, {
      weekday: "narrow",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2024, 0, 7 + index))),
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    return new Date(Date.UTC(year, month, 1)).getUTCDay();
  };

  const adjacentMonth = (offset: number) =>
    new Date(
      Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth() + offset, 1),
    );

  const formatMonth = (date: Date) =>
    date.toLocaleString(localeTag, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  const dayValue = (day: number) => {
    const year = viewDate.getUTCFullYear();
    const month = (viewDate.getUTCMonth() + 1).toString().padStart(2, "0");
    const dayStr = day.toString().padStart(2, "0");
    return `${year}-${month}-${dayStr}`;
  };

  const handleDayClick = (day: number) => {
    onChange(dayValue(day));
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const slots = [];

    for (let i = 0; i < firstDay; i++) {
      slots.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = dayValue(i);
      const selected = date === value;
      const isToday = date === todayDate;
      const disabled = Boolean(maxDate && date > maxDate);

      slots.push(
        <button
          key={i}
          type="button"
          disabled={disabled}
          aria-pressed={selected}
          aria-current={isToday ? "date" : undefined}
          onClick={() => handleDayClick(i)}
          className={`
            w-8 h-8 text-xs flex items-center justify-center rounded-lg transition-all relative disabled:cursor-not-allowed disabled:opacity-30
            ${
              selected
                ? "bg-(--theme-solid-bg) text-(--theme-solid-fg,white)"
                : "fuwari-text-75 enabled:hover:bg-(--theme-tonal-bg)"
            }
            ${isToday && !selected ? "font-medium fuwari-text-90" : ""}
          `}
        >
          {i}
          {isToday && !selected && (
            <div className="absolute bottom-1 left-1/2 h-px w-1 -translate-x-1/2 bg-(--theme-accent)"></div>
          )}
        </button>,
      );
    }

    return slots;
  };

  return (
    <div className={`relative ${className}`}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => {
          if (!isOpen) setViewDate(new Date(`${activeDate}T00:00:00Z`));
          setIsOpen(!isOpen);
        }}
        className="fuwari-input relative cursor-pointer pl-9 text-left"
      >
        <CalendarIcon
          className="absolute left-3 top-1/2 -translate-y-1/2 fuwari-text-50"
          size={14}
          strokeWidth={1.5}
        />
        <span className={value ? "" : "fuwari-text-30"}>
          {value || m.common_select_date()}
        </span>
      </button>

      <FloatingPopover
        open={isOpen}
        anchor={isOpen ? triggerRef.current : null}
        onDismiss={() => setIsOpen(false)}
        returnFocusOnEscape
        // The chosen day, else today, else the first day that can be picked.
        initialFocus={() =>
          calendarRef.current?.querySelector<HTMLElement>(
            '[aria-pressed="true"]',
          ) ??
          calendarRef.current?.querySelector<HTMLElement>(
            '[aria-current="date"]:enabled',
          ) ??
          calendarRef.current?.querySelector<HTMLElement>("button:enabled") ??
          null
        }
        role="dialog"
        aria-label={m.common_select_date()}
        className="w-70 p-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium fuwari-text-90">
            {formatMonth(viewDate)}
          </h4>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={formatMonth(adjacentMonth(-1))}
              onClick={() => setViewDate(adjacentMonth(-1))}
              className="p-1 fuwari-text-50 hover:text-(--theme-accent) transition-colors"
            >
              <ChevronLeft size={14} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label={formatMonth(adjacentMonth(1))}
              onClick={() => setViewDate(adjacentMonth(1))}
              className="p-1 fuwari-text-50 hover:text-(--theme-accent) transition-colors"
            >
              <ChevronRight size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Grid Header (Days) */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {daysOfWeek.map((d, index) => (
            <div
              key={index}
              className="w-8 text-center text-[11px] fuwari-text-30"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grid Body */}
        <div ref={calendarRef} className="grid grid-cols-7 gap-0.5">
          {renderCalendar()}
        </div>
      </FloatingPopover>
    </div>
  );
};

export default DatePicker;
