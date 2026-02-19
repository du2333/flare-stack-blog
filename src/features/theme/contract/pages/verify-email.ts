export interface VerifyEmailPageProps {
  status: "ANALYZING" | "SUCCESS" | "ERROR";
  error: string | undefined;
}
