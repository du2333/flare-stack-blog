import { useEffect, useState } from "react";

export interface UseVerifyEmailOptions {
  error: string | undefined;
}

export function useVerifyEmail(options: UseVerifyEmailOptions) {
  const { error } = options;

  const [status, setStatus] = useState<"ANALYZING" | "SUCCESS" | "ERROR">(
    "ANALYZING",
  );

  useEffect(() => {
    const analyzeSignal = async () => {
      // Small artificial delay for smooth transition
      await new Promise((r) => setTimeout(r, 1500));
      setStatus(error ? "ERROR" : "SUCCESS");
    };

    analyzeSignal();
  }, [error]);

  return { status };
}

export type UseVerifyEmailReturn = ReturnType<typeof useVerifyEmail>;
