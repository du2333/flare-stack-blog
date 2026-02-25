import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UploadItem } from "../types";
import { uploadImageFn, getGuitarTabMetaFn } from "@/features/media/media.api";
import { MEDIA_KEYS } from "@/features/media/queries";
import { formatBytes } from "@/lib/utils";

const GP_EXTENSIONS = /\.(gp[345x]?|gp)$/i;

/** 封面获取轮询：每 3 秒查一次，最多 15 秒 */
const COVER_POLL_INTERVAL = 3_000;
const COVER_POLL_TIMEOUT = 15_000;

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
      const result = await uploadImageFn({ data: formData });
      return result;
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

      const isGpFile = GP_EXTENSIONS.test(item.name);

      // Update to UPLOADING
      setQueue((prev) =>
        prev.map((q, i) =>
          i === waitingIndex
            ? {
                ...q,
                status: "UPLOADING",
                progress: isGpFile ? 30 : 50,
                log: "> UPLOAD_STREAM: 数据包发送中...",
              }
            : q,
        ),
      );

      // 吉他谱文件：上传+解析后立即完成，封面获取通过 toast 跟踪
      try {
        if (isGpFile) {
          try {
            const result = await uploadMutation.mutateAsync(item.file);

            if (isMountedRef.current) {
              const meta = result.guitarTabMeta;
              const displayName = meta?.title
                ? `${meta.title}${meta.artist ? ` - ${meta.artist}` : ""}`
                : item.name;

              // 立即标记完成，可以关闭弹窗
              setQueue((prev) =>
                prev.map((q, i) =>
                  i === waitingIndex
                    ? {
                        ...q,
                        status: "COMPLETE",
                        progress: 100,
                        log: meta?.title
                          ? `> 解析完成: ${displayName}`
                          : "> 上传完成。资产已索引。",
                      }
                    : q,
                ),
              );

              toast.success(
                meta?.title
                  ? `🎸 吉他谱解析完成: ${displayName}`
                  : `上传完成: ${item.name}`,
              );
              queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });

              // 如果有元数据，启动封面获取轮询（后台 toast 追踪）
              if (meta?.title) {
                pollCoverFetch(
                  result.id,
                  displayName,
                  queryClient,
                );
              }
            }
          } catch (error) {
            throw error;
          }
        } else {
          // 非吉他谱文件：原有流程
          await uploadMutation.mutateAsync(item.file);

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
        }
      } catch (error: unknown) {
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

/**
 * 轮询检查封面是否已获取，通过 toast 展示进度
 */
function pollCoverFetch(
  mediaId: number,
  displayName: string,
  queryClient: ReturnType<typeof useQueryClient>,
) {
  const toastId = `cover-fetch-${mediaId}`;
  toast.loading(`🎨 正在获取封面: ${displayName}`, {
    id: toastId,
    duration: Infinity,
  });

  const startTime = Date.now();

  const timer = setInterval(async () => {
    const elapsed = Date.now() - startTime;

    // 超时
    if (elapsed >= COVER_POLL_TIMEOUT) {
      clearInterval(timer);
      toast.error(`封面获取超时: ${displayName}`, {
        id: toastId,
        duration: 4000,
      });
      queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
      return;
    }

    try {
      const meta = await getGuitarTabMetaFn({ data: { mediaId } });
      if (meta?.coverMediaId) {
        clearInterval(timer);
        toast.success(`🎨 封面已获取: ${displayName}`, {
          id: toastId,
          duration: 3000,
        });
        queryClient.invalidateQueries({ queryKey: MEDIA_KEYS.all });
      }
    } catch {
      // 轮询失败忽略，等下次重试
    }
  }, COVER_POLL_INTERVAL);
}