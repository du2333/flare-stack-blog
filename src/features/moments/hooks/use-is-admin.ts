import { useSession } from "@/lib/auth/auth-client";

/**
 * Whether the signed-in viewer is an Admin. The session loads in the browser
 * only, so public pages, which Workers Cache serves to everyone, never carry
 * Admin controls in their HTML; the server checks the role again on every write.
 */
export function useIsAdmin() {
  const { data: session } = useSession();
  return session?.user.role === "admin";
}
