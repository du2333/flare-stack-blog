import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UploadItem } from "../types";
import { uploadImageFn } from "@/features/media/media.api";
import { MEDIA_KEYS } from "@/features/media/queries";
import { formatBytes } from "@/lib/utils";

export function useMediaUpload() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [queue, setQueue] = useState<Array<UploadItem>>([]);
  const [isDragging, setIsDragging] = useState(false);

  const processingRef = useRef(false);
  const isMountedRef = useRef(true);

  // 监听组件挂载和卸载
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      return await uploadImageFn({ data: formData });
    },
  });

  // Process upload queue
  useEffect(() => {
    const processQueue = async () => {
      const waitingIndex = queue.findIndex((item) => item.status === "WAITING");
      const item = queue[waitingIndex];

      if (waitingIndex === -1 || processingRef.current) {
        return;
      }

      // LOCK
      processingRef.current = true;

      if (!item.file) {
        setQueue((prev) =>
          prev.map((q, i) =>
            i === waitingIndex
              ? { ...q, status: "ERROR", log: "> ERROR: 没有数据包" }
              : q,
          ),
        );
        processingRef.current = false;
        return;
      }

      // Update to UPLOADING
      setQueue((prev) =>
        prev.map((q, i) =>
          i === waitingIndex
            ? {
                ...q,
                status: "UPLOADING",
                progress: 50,
                log: "> UPLOAD_STREAM: 数据包发送中...",
              }
            : q,
        ),
      );

      try {
        const result = await uploadMutation.mutateAsync(item.file);
        if (result.error) {
          if (isMountedRef.current) {
            const message = "媒体入库失败，请重试";

            setQueue((prev) =>
              prev.map((q, i) =>
                i === waitingIndex
                  ? {
                      ...q,
                      status: "ERROR",
                      progress: 0,
                      log: `> ERROR: ${message}`,
                    }
                  : q,
              ),
            );
            toast.error(`上传失败: ${item.name}`, { description: message });
          }
          return;
        }

        if (isMountedRef.current) {
          setQueue((prev) =>
            prev.map((q, i) =>
              i === waitingIndex
                ? {
                    ...q,
                    status: "COMPLETE",
                    progress: 100,
                    log: "> 上传完成。资产已索引。",
                  }
                : q,
            ),
          );

          toast.success(`上传完成: ${item.name}`);
          queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
        }
      } catch (error) {
        if (isMountedRef.current) {
          setQueue((prev) =>
            prev.map((q, i) =>
              i === waitingIndex
                ? {
                    ...q,
                    status: "ERROR",
                    progress: 0,
                    log: `> ERROR: ${
                      error instanceof Error ? error.message : "上传失败"
                    }`,
                  }
                : q,
            ),
          );
          toast.error(`上传失败: ${item.name}`);
        }
      } finally {
        // 关键修复：使用 finally 确保锁一定会被释放
        processingRef.current = false;
      }
    };

    processQueue();
  }, [queue, uploadMutation, queryClient]);

  const processFiles = (files: Array<File>) => {
    const newItems: Array<UploadItem> = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: formatBytes(file.size),
      progress: 0,
      status: "WAITING" as const,
      log: "> 初始化上传握手...",
      file,
    }));
    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const reset = () => {
    setQueue([]);
    processingRef.current = false;
    setIsOpen(false);
  };

  return {
    isOpen,
    setIsOpen,
    queue,
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    processFiles,
    reset,
  };
}
