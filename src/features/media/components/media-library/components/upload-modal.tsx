import { ClientOnly } from "@tanstack/react-router";
import { Loader2, X } from "lucide-react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import type { UploadItem } from "../types";
import type React from "react";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/features/media/media.schema";

interface UploadModalProps {
  isOpen: boolean;
  queue: Array<UploadItem>;
  isDragging: boolean;
  onClose: () => void;
  onFileSelect: (files: Array<File>) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

function UploadModalInternal({
  isOpen,
  queue,
  isDragging,
  onClose,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
}: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accept = ACCEPTED_IMAGE_TYPES.join(",");
  const maxSizeMb = Math.floor(MAX_FILE_SIZE / 1024 / 1024);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFileSelect(Array.from(event.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isAllComplete =
    queue.length > 0 &&
    queue.every((i) => i.status === "COMPLETE" || i.status === "ERROR");
  const hasErrors = queue.some((i) => i.status === "ERROR");

  return createPortal(
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center p-4 md:p-6 transition-all duration-300 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`
          relative w-full max-w-md bg-background border border-border/30
          flex flex-col transform transition-all duration-300 max-h-[85vh]
          ${isOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}
        `}
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-4 flex items-start justify-between shrink-0">
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">
              [ UPLOAD ]
            </p>
            <h2 className="text-2xl font-serif font-medium text-foreground">
              上传文件
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          className="hidden"
          multiple
          accept={accept}
        />

        {/* Body */}
        <div className="px-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 pb-2">
          {/* Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
              relative border border-dashed py-8 px-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-300
              ${
                isDragging
                  ? "border-foreground bg-accent/20"
                  : "border-border/50 hover:border-foreground/50 hover:bg-accent/5"
              }
            `}
          >
            <div className="text-center space-y-2">
              <p className="text-xs font-mono uppercase tracking-widest text-foreground">
                {isDragging ? "松开此处以上传" : "点击或拖拽文件至此"}
              </p>
              <p className="text-xs font-mono text-muted-foreground/60">
                支持 JPEG/JPG/PNG/WEBP/GIF (最大 {maxSizeMb}MB)
              </p>
            </div>
          </div>

          {/* Queue List */}
          {queue.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">
                  上传队列 [{queue.length}]
                </span>
              </div>

              <div className="space-y-2">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="group bg-background p-3 border border-border/30 flex flex-col gap-2 transition-all hover:border-border/60"
                  >
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="truncate max-w-40 text-foreground font-medium">
                        {item.name}
                      </span>
                      <span className="text-muted-foreground/70">
                        {item.size}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-1 w-full bg-muted/30 overflow-hidden">
                      <div
                        className={`absolute top-0 left-0 h-full transition-all duration-300 ${
                          item.status === "COMPLETE"
                            ? "bg-emerald-500"
                            : item.status === "ERROR"
                              ? "bg-destructive"
                              : "bg-foreground"
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs font-mono tracking-widest mt-1">
                      <div className="flex items-center gap-2">
                        {item.status === "UPLOADING" && (
                          <Loader2
                            size={10}
                            className="animate-spin text-foreground"
                          />
                        )}
                        <span
                          className={`uppercase ${
                            item.status === "ERROR"
                              ? "text-destructive"
                              : item.status === "COMPLETE"
                                ? "text-emerald-500"
                                : "text-muted-foreground/70"
                          }`}
                        >
                          {item.status === "COMPLETE"
                            ? "完成"
                            : item.status === "ERROR"
                              ? "失败"
                              : item.status === "UPLOADING"
                                ? "上传中"
                                : "等待中"}
                        </span>
                      </div>
                      {item.log && (
                        <span
                          className={`max-w-37.5 truncate normal-case tracking-normal ${item.status === "ERROR" ? "text-destructive/80" : "text-muted-foreground/50"}`}
                        >
                          {item.log.replace(/^>\s*/, "")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-4 flex justify-end gap-3 shrink-0">
          {queue.length > 0 && !isAllComplete && (
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-mono uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              后台上传
            </button>
          )}

          {isAllComplete ? (
            <button
              onClick={onClose}
              className={`
                px-6 py-2.5 text-xs font-mono uppercase tracking-widest transition-all
                ${
                  hasErrors
                    ? "bg-destructive text-destructive-foreground hover:opacity-80"
                    : "bg-foreground text-background hover:opacity-80"
                }
              `}
            >
              {hasErrors ? "确认 (含错误)" : "完成"}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-mono uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              取消
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function UploadModal(props: UploadModalProps) {
  return (
    <ClientOnly>
      <UploadModalInternal {...props} />
    </ClientOnly>
  );
}
