import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
} from "@/features/media/media.schema";
import { orpc, orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

type UploadedMedia = Awaited<ReturnType<typeof orpcClient.media.upload>>;

/** Where one file of an upload is: waiting, being sent, done or given up on. */
export type UploadFileState = "queued" | "uploading" | "done" | "failed";

export interface UploadFilesOptions {
  /**
   * Told how each file is doing, for a caller that shows every file on its
   * own; the Media a file became comes with `done`. Only files that will be
   * sent are announced, and each one ends in `done` or `failed`.
   */
  onFileState?: (
    file: File,
    state: UploadFileState,
    media?: UploadedMedia,
  ) => void;
  /** Leaves out the toast after each file, for a caller that shows them itself. */
  quietSuccess?: boolean;
}

export function useMediaUpload() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => orpcClient.media.upload({ image: file }),
  });

  /** Uploads the image files, resolving with the Media each one became. */
  const uploadFiles = async (
    files: Array<File>,
    { onFileState, quietSuccess = false }: UploadFilesOptions = {},
  ) => {
    const uploaded: Array<UploadedMedia> = [];
    const images = files.filter((file) =>
      ACCEPTED_IMAGE_TYPES.includes(file.type),
    );
    if (images.length === 0) {
      toast.error(m.media_validation_file_invalid_type());
      return uploaded;
    }

    const sendable = images.filter((file) => file.size <= MAX_FILE_SIZE);
    for (const file of images) {
      if (file.size > MAX_FILE_SIZE)
        toast.error(m.media_validation_file_too_large());
    }
    for (const file of sendable) onFileState?.(file, "queued");

    setProgress({ current: 0, total: images.length });
    try {
      for (let i = 0; i < sendable.length; i++) {
        const file = sendable[i];
        setProgress({ current: i + 1, total: sendable.length });
        onFileState?.(file, "uploading");
        try {
          const media = await uploadMutation.mutateAsync(file);
          uploaded.push(media);
          if (!quietSuccess) toast.success(m.media_upload_success());
          onFileState?.(file, "done", media);
        } catch {
          toast.error(m.media_upload_fail({ name: file.name }));
          onFileState?.(file, "failed");
        }
      }
      await queryClient.invalidateQueries({ queryKey: orpc.media.key() });
    } finally {
      setProgress(null);
    }
    return uploaded;
  };

  return {
    uploadFiles,
    progress,
    isUploading: progress != null,
  };
}
