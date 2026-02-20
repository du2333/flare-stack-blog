import { ClientOnly } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type React from "react";
import { useDelayUnmount } from "@/hooks/use-delay-unmount";

export type ModalType = "LINK" | "IMAGE" | null;

interface FuwariInsertModalProps {
  type: ModalType;
  initialUrl?: string;
  onClose: () => void;
  onSubmit: (url: string, attrs?: { width?: number; height?: number }) => void;
}

const FuwariInsertModalInternal: React.FC<FuwariInsertModalProps> = ({
  type,
  initialUrl = "",
  onClose,
  onSubmit,
}) => {
  const isMounted = !!type;
  const shouldRender = useDelayUnmount(isMounted, 400); // Slightly faster than original
  const [activeType, setActiveType] = useState<ModalType>(type);
  const [inputUrl, setInputUrl] = useState(initialUrl);

  useEffect(() => {
    if (type) {
      setActiveType(type);
      setInputUrl(initialUrl);
    }
  }, [type, initialUrl]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputUrl.trim();
    if (activeType === "LINK") {
      if (trimmed || initialUrl.trim()) onSubmit(trimmed);
      return;
    }
    if (trimmed) onSubmit(trimmed);
  };

  if (!shouldRender) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center p-4 md:p-6 transition-all duration-300 ${
        isMounted
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`
          relative w-full max-w-md fuwari-card-base p-0
          flex flex-col transform transition-all duration-300
          ${isMounted ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"}
        `}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold fuwari-text-90">
            {activeType === "LINK" ? "插入链接" : "插入图片"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 -mr-1 fuwari-text-30 hover:fuwari-text-75 transition-colors"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-4 flex flex-col gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium fuwari-text-75 ml-1">
              {activeType === "IMAGE" ? "图片链接" : "链接地址"}
            </label>
            <input
              type="url"
              autoFocus
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl border border-(--fuwari-input-border) bg-(--fuwari-input-bg) focus:outline-none focus:border-(--fuwari-primary)/50 transition-all fuwari-text-90 text-sm"
            />
          </div>

          <p className="text-xs fuwari-text-30 px-1">
            {activeType === "LINK"
              ? "输入您想要指向的 URL 地址。"
              : "输入图片的网络地址。"}
          </p>
        </form>

        {/* Footer Actions */}
        <div className="px-6 pb-6 flex justify-end gap-3 mt-2">
          <button
            onClick={onClose}
            className="h-10 px-4 text-sm fuwari-text-50 hover:fuwari-text-75 transition-colors font-medium"
          >
            取消
          </button>
          <button
            onClick={() => handleSubmit()}
            disabled={
              activeType === "LINK"
                ? !inputUrl.trim() && !initialUrl.trim()
                : !inputUrl.trim()
            }
            className="fuwari-btn-primary h-10 px-6 text-sm rounded-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {activeType === "LINK" && !inputUrl.trim() && initialUrl.trim()
              ? "移除链接"
              : "确认提交"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export const FuwariInsertModal: React.FC<FuwariInsertModalProps> = (props) => {
  return (
    <ClientOnly>
      <FuwariInsertModalInternal {...props} />
    </ClientOnly>
  );
};
