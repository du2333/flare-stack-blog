import { ClientOnly } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useRef } from "react";
import { createPortal } from "react-dom";
import type { UploadItem } from "../types";
import type React from "react";
import { Button } from "@/components/ui/button";

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
      className={`fixed inset-0 z-100 flex items-center justify-center p-4 md:p-6 transition-all duration-500 ease-in-out ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/95 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        className={`
          relative w-full max-w-2xl bg-background border border-border shadow-none 
          flex flex-col overflow-hidden rounded-none max-h-[85vh] transition-all duration-500 ease-in-out transform
          ${
            isOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-95 opacity-0"
          }
        `}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono tracking-wider uppercase text-foreground">
              上传管理
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-none"
          >
            <X size={14} />
          </Button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleInputChange}
          className="hidden"
          multiple
          accept="image/*,video/*,audio/*,.gp,.gp3,.gp4,.gp5,.gpx"
        />

        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1 min-h-0 bg-muted/5">
          {/* Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
              relative border border-dashed aspect-video flex flex-col items-center justify-center cursor-pointer transition-all duration-300 gap-4 rounded-none
              ${
                isDragging
                  ? "border-foreground bg-accent/20"
                  : "border-border/50 hover:border-foreground/50 hover:bg-accent/5"
              }
            `}
          >
            <div className="font-mono text-[10px] text-muted-foreground whitespace-pre text-center leading-none opacity-50 select-none pointer-events-none">
              {`
      +-----------------------------+
      |        在此处释放文件        |
      |   [ image.png, video.mp4 ]  |
      +-----------------------------+
`}
            </div>

            <div className="text-center space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-foreground">
                {isDragging ? "松开即可上传" : "点击或拖拽文件至此"}
              </p>
              <p className="text-[9px] font-mono text-muted-foreground leading-relaxed max-w-md">
                图片 (JPG/PNG/WebP/GIF ≤30MB) · 吉他谱 (GP3/4/5/GPX ≤50MB)
                <br />
                视频 (MP4/WebM/MOV ≤512MB) · 音频 (MP3/WAV/OGG/FLAC ≤50MB)
              </p>
            </div>
          </div>

          {/* Queue List */}
          <div className="space-y-4">
            {queue.length > 0 && (
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                  队列状态
                </span>
                <span className="text-[10px] font-mono text-foreground">
                  {queue.length} 个项目
                </span>
              </div>
            )}

            <div className="space-y-2">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="group bg-background p-3 border border-border/30 flex flex-col gap-2 transition-all hover:border-border/60"
                >
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="truncate max-w-50 text-foreground">
                      {item.name}
                    </span>
                    <span className="text-muted-foreground">{item.size}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-2 w-full bg-muted/30 overflow-hidden">
                    <div
                      className={`absolute top-0 left-0 h-full transition-all duration-300 ${
                        item.status === "COMPLETE"
                          ? "bg-emerald-500"
                          : item.status === "ERROR"
                            ? "bg-red-500"
                            : "bg-foreground"
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[9px] font-mono uppercase">
                    <span
                      className={`${
                        item.status === "ERROR"
                          ? "text-red-500"
                          : "text-muted-foreground"
                      }`}
                    >
                      {item.status === "COMPLETE"
                        ? "完成"
                        : item.status === "ERROR"
                          ? "失败"
                          : "上传中..."}
                    </span>
                    {item.log && (
                      <span className="text-red-500 max-w-37.5 truncate">
                        {item.log}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/30 flex justify-end gap-3 shrink-0 bg-background">
          {isAllComplete ? (
            <Button
              onClick={onClose}
              variant={hasErrors ? "destructive" : "default"}
              size="sm"
              className="h-9 px-6 text-[10px] uppercase tracking-[0.2em] font-medium rounded-none gap-2 bg-foreground text-background hover:bg-foreground/90"
            >
              [ {hasErrors ? "确认 (含错误)" : "完成"} ]
            </Button>
          ) : (
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-9 px-6 text-[10px] uppercase tracking-[0.2em] font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-none"
            >
              [ 取消 ]
            </Button>
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
