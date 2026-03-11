import { ChevronDown, Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { m } from "@/paraglide/messages";
import { getLocale, setLocale } from "@/paraglide/runtime";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLocale = getLocale();

  const handleLanguageChange = (locale: "zh" | "en") => {
    setLocale(locale);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-full h-full text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80 transition-colors group"
        aria-label={m.common_switch_language()}
      >
        <Languages
          size={18}
          strokeWidth={1.5}
          className="group-hover:scale-110 transition-transform"
        />
        <ChevronDown
          size={12}
          className={`ml-1 opacity-70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-32 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 z-50 py-1 animate-in fade-in zoom-in-95 duration-200 rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={() => handleLanguageChange("zh")}
            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
              currentLocale === "zh"
                ? "text-(--fuwari-primary) bg-black/5 dark:bg-white/5 font-bold"
                : "text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            中文
          </button>
          <button
            onClick={() => handleLanguageChange("en")}
            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
              currentLocale === "en"
                ? "text-(--fuwari-primary) bg-black/5 dark:bg-white/5 font-bold"
                : "text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            English
          </button>
        </div>
      )}
    </div>
  );
}
