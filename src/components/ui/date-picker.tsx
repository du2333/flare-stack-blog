import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial value or default to today
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState(initialDate);
  const locale = getLocale();
  const localeTag = locale === "zh" ? "zh-CN" : "en-US";

  const daysOfWeek = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(localeTag, { weekday: "narrow" }).format(
      new Date(Date.UTC(2024, 0, 7 + index)),
    ),
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth() + offset,
      1,
    );
    setViewDate(newDate);
  };

  const handleDayClick = (day: number) => {
    const year = viewDate.getFullYear();
    const month = (viewDate.getMonth() + 1).toString().padStart(2, "0");
    const dayStr = day.toString().padStart(2, "0");
    const dateString = `${year}-${month}-${dayStr}`;

    onChange(dateString);
    setIsOpen(false);
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    const [vYear, vMonth, vDay] = value.split("-").map(Number);
    return vYear === currentYear && vMonth - 1 === currentMonth && vDay === day;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewDate.getMonth() &&
      today.getFullYear() === viewDate.getFullYear()
    );
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const slots = [];

    for (let i = 0; i < firstDay; i++) {
      slots.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const selected = isSelected(i);
      const today = isToday(i);

      slots.push(
        <button
          key={i}
          onClick={() => handleDayClick(i)}
          className={`
            w-8 h-8 text-xs flex items-center justify-center rounded-lg transition-all relative
            ${
              selected
                ? "bg-(--fuwari-primary) text-white"
                : "fuwari-text-75 hover:bg-(--fuwari-btn-regular-bg)"
            }
            ${today && !selected ? "font-medium fuwari-text-90" : ""}
          `}
        >
          {i}
          {today && !selected && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-px bg-foreground"></div>
          )}
        </button>,
      );
    }

    return slots;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-10 w-full cursor-pointer rounded-xl bg-(--fuwari-btn-regular-bg) pl-9 pr-3 text-left text-sm fuwari-text-90"
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

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 w-70 rounded-xl bg-(--fuwari-card-bg) p-4 shadow-md ring-1 ring-(--fuwari-input-border) animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-serif font-medium text-foreground">
              {viewDate.toLocaleString(localeTag, {
                month: "long",
                year: "numeric",
              })}
            </h4>
            <div className="flex items-center gap-1">
              <button
                onClick={() => changeMonth(-1)}
                className="text-muted-foreground/50 hover:text-foreground transition-colors p-1"
              >
                <ChevronLeft size={14} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => changeMonth(1)}
                className="text-muted-foreground/50 hover:text-foreground transition-colors p-1"
              >
                <ChevronRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Grid Header (Days) */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {daysOfWeek.map((d) => (
              <div
                key={d}
                className="w-8 text-center text-[11px] fuwari-text-30"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid Body */}
          <div className="grid grid-cols-7 gap-0.5">{renderCalendar()}</div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
