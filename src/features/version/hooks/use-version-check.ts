import { useQuery } from "@tanstack/react-query";
import { updateCheckQuery } from "../queries";

/**
 * Runs the update check in the background when any Admin page opens. It shows
 * nothing itself: 「概览」 reads the same query and presents the answer.
 */
export function useVersionCheck() {
  useQuery({
    ...updateCheckQuery,
    enabled: typeof window !== "undefined",
  });
}
