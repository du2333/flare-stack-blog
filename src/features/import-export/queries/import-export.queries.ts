import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StartExportInput } from "@/features/import-export/import-export.schema";
import {
  getExportProgressFn,
  startExportFn,
} from "@/features/import-export/api/export.api";
import {
  getImportProgressFn,
  uploadForImportFn,
} from "@/features/import-export/api/import.api";
import { POSTS_KEYS } from "@/features/posts/queries";

export function useStartExport() {
  return useMutation({
    mutationFn: (input: StartExportInput) => startExportFn({ data: input }),
  });
}

export function useExportProgress(taskId: string | null) {
  return useQuery({
    queryKey: ["export-progress", taskId],
    queryFn: () => getExportProgressFn({ data: { taskId: taskId! } }),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000; // KV not ready yet — keep polling
      return data.status === "processing" || data.status === "pending"
        ? 2000
        : false;
    },
    enabled: !!taskId,
  });
}

export function useUploadForImport() {
  return useMutation({
    mutationFn: (formData: FormData) => uploadForImportFn({ data: formData }),
  });
}

export function useImportProgress(taskId: string | null) {
  const queryClient = useQueryClient();
  const invalidatedRef = useRef(false);

  const query = useQuery({
    queryKey: ["import-progress", taskId],
    queryFn: () => getImportProgressFn({ data: { taskId: taskId! } }),
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return 2000; // KV not ready yet — keep polling
      return data.status === "processing" || data.status === "pending"
        ? 2000
        : false;
    },
    enabled: !!taskId,
  });

  const status = query.data?.status;

  useEffect(() => {
    if (
      (status === "completed" || status === "failed") &&
      !invalidatedRef.current
    ) {
      invalidatedRef.current = true;
      queryClient.invalidateQueries({ queryKey: POSTS_KEYS.adminLists });
      queryClient.invalidateQueries({ queryKey: POSTS_KEYS.counts });
    }
  }, [status, queryClient]);

  // Reset ref when taskId changes (new import)
  useEffect(() => {
    invalidatedRef.current = false;
  }, [taskId]);

  return query;
}
