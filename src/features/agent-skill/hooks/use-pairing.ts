import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  cancelPairingCode,
  type GeneratedPairingCode,
  generatePairingCode,
  type PairingState,
  type PairingStatus,
  pairingStatusQuery,
} from "@/features/agent-skill/queries";
import {
  API_KEYS_QUERY_KEY,
  useApiKeys,
} from "@/features/api-keys/hooks/use-api-keys";
import { m } from "@/paraglide/messages";

export function usePairing() {
  const queryClient = useQueryClient();
  const statusQuery = useQuery(pairingStatusQuery);
  const status = statusQuery.data;
  const { keys, isError: keysFailed } = useApiKeys();

  // The server stores only the code's hash, so the plain code exists in the
  // answer to generating it and nowhere else. It lives in this state alone:
  // a reload loses it, and the code is not written to any storage.
  const [issued, setIssued] = useState<GeneratedPairingCode | null>(null);
  const code =
    status?.state === "waiting" &&
    issued &&
    status.expiresAt?.getTime() === issued.expiresAt.getTime()
      ? issued.code
      : undefined;

  const connectedKeyId =
    status?.state === "connected" ? status.agent?.apiKeyId : undefined;

  // The key list is read afresh for a connected agent: the paired key is new
  // to it, and status keeps saying `connected` after the key was deleted.
  const [checkedKeyId, setCheckedKeyId] = useState<string>();
  useEffect(() => {
    if (!connectedKeyId) return;
    let current = true;
    void queryClient
      .invalidateQueries({ queryKey: API_KEYS_QUERY_KEY })
      .then(() => {
        if (current) setCheckedKeyId(connectedKeyId);
      });
    return () => {
      current = false;
    };
  }, [connectedKeyId, queryClient]);

  const isCheckingAgent =
    connectedKeyId !== undefined && checkedKeyId !== connectedKeyId;
  const agentRevoked =
    connectedKeyId !== undefined &&
    !isCheckingAgent &&
    !keysFailed &&
    !keys.some((key) => key.id === connectedKeyId);
  // A revoked agent is no longer connected; the tab starts over.
  const state: PairingState = agentRevoked ? "none" : (status?.state ?? "none");

  const refreshStatus = () =>
    queryClient.invalidateQueries({ queryKey: pairingStatusQuery.queryKey });

  const generateMutation = useMutation({
    mutationFn: generatePairingCode,
    onSuccess: (generated) => {
      setIssued(generated);
      queryClient.setQueryData<PairingStatus>(pairingStatusQuery.queryKey, {
        state: "waiting",
        expiresAt: generated.expiresAt,
      });
      return refreshStatus();
    },
    onError: () => {
      toast.error(m.agent_skill_pair_generate_failed());
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPairingCode,
    onSuccess: () => {
      setIssued(null);
      return refreshStatus();
    },
    onError: () => {
      toast.error(m.agent_skill_pair_cancel_failed());
    },
  });

  return {
    state,
    agent: state === "connected" ? status?.agent : undefined,
    code,
    expiresAt: status?.expiresAt,
    isLoading: statusQuery.isPending || isCheckingAgent,
    isError: statusQuery.isError && status === undefined,
    reload: statusQuery.refetch,
    generate: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    cancel: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
  };
}
