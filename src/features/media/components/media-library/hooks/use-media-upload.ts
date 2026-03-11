import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { uploadImageFn } from "@/features/media/api/media.api";
import { MEDIA_KEYS } from "@/features/media/queries";
import { formatBytes } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import type { UploadItem } from "../types";

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
              ? {
                  ...q,
                  status: "ERROR",
                  log: m.media_upload_log_error_no_data(),
                }
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
                log: m.media_upload_log_stream_sending(),
              }
            : q,
        ),
      );

      try {
        const result = await uploadMutation.mutateAsync(item.file);
        if (result.error) {
          if (isMountedRef.current) {
            const message = m.media_upload_error_db();

            setQueue((prev) =>
              prev.map((q, i) =>
                i === waitingIndex
                  ? {
                      ...q,
                      status: "ERROR",
                      progress: 0,
                      log: m.media_upload_log_error({ message }),
                    }
                  : q,
              ),
            );
            toast.error(m.media_upload_fail({ name: item.name }), {
              description: message,
            });
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
                    log: m.media_upload_log_complete(),
                  }
                : q,
            ),
          );

          toast.success(m.media_upload_success({ name: item.name }));
          queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
        }
      } catch (error) {
        if (isMountedRef.current) {
          const message =
            error instanceof Error
              ? error.message
              : m.request_error_unknown_title();

          setQueue((prev) =>
            prev.map((q, i) =>
              i === waitingIndex
                ? {
                    ...q,
                    status: "ERROR",
                    progress: 0,
                    log: m.media_upload_log_error({ message }),
                  }
                : q,
            ),
          );
          toast.error(m.media_upload_fail({ name: item.name }), {
            description: message,
          });
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
      log: m.media_upload_log_init(),
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
