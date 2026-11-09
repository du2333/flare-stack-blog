import type { PublicMoment } from "@/features/moments/schema/moments.schema";

// Stubs for the Admin's part of the Moments page; the Admin ticket replaces
// this file with the composer and the edit and delete actions.

/** The form above the timeline where the Admin posts a Moment. */
export function MomentComposer(_props: { onPosted?: () => void }) {
  return null;
}

/** The Admin's edit and delete actions on one Moment. */
export function MomentAdminActions(_props: { moment: PublicMoment }) {
  return null;
}
