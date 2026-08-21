import { isDefinedError } from "@orpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { StartExportInput } from "@/features/import-export/import-export.schema";
import { orpc, orpcClient } from "@/lib/orpc";

function shouldKeepPollingTask(error: unknown) {
  return (
    isDefinedError(error as never) &&
    (error as { code: string }).code === "TASK_NOT_FOUND"
  );
}

export function useStartExport() {
  return useMutation({
    mutationFn: (input: StartExportInput) =>
      orpcClient.importExport.startExport(input),
  });
}

export function useExportProgress(taskId: string | null) {
  return useQuery(
    orpc.importExport.exportProgress.queryOptions({
      input: { taskId: taskId ?? "" },
      enabled: !!taskId,
      refetchInterval: (query) => {
        if (shouldKeepPollingTask(query.state.error)) return 2000;
        const data = query.state.data;
        if (!data) return 2000;
        return data.status === "processing" || data.status === "pending"
          ? 2000
          : false;
      },
      retry: (count, error) => shouldKeepPollingTask(error) || count < 2,
    }),
  );
}

export function useUploadForImport() {
  return useMutation({
    mutationFn: (formData: FormData) => {
      const files = formData
        .getAll("file")
        .filter((f): f is File => f instanceof File);
      return orpcClient.importExport.startImport({ file: files });
    },
  });
}

export function useImportProgress(taskId: string | null) {
  const queryClient = useQueryClient();
  const invalidatedRef = useRef(false);

  const query = useQuery(
    orpc.importExport.importProgress.queryOptions({
      input: { taskId: taskId ?? "" },
      enabled: !!taskId,
      refetchInterval: (q) => {
        if (shouldKeepPollingTask(q.state.error)) return 2000;
        const data = q.state.data;
        if (!data) return 2000;
        return data.status === "processing" || data.status === "pending"
          ? 2000
          : false;
      },
      retry: (count, error) => shouldKeepPollingTask(error) || count < 2,
    }),
  );

  const status = query.data?.status;

  useEffect(() => {
    if (
      (status === "completed" || status === "failed") &&
      !invalidatedRef.current
    ) {
      invalidatedRef.current = true;
      queryClient.invalidateQueries({ queryKey: orpc.posts.admin.list.key() });
      queryClient.invalidateQueries({ queryKey: orpc.posts.admin.count.key() });
    }
  }, [status, queryClient]);

  useEffect(() => {
    invalidatedRef.current = false;
  }, [taskId]);

  return query;
}
