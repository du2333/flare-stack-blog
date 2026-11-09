import { useMutation } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { IconButton } from "@/components/ui/icon-button";
import type { PublicMoment } from "@/features/moments/schema/moments.schema";
import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { isMomentGone } from "./moment-draft";
import { useMomentRefresh } from "./use-moment-refresh";

/**
 * Edit and delete for one Moment. Editing is the card's to show, in place;
 * deleting asks first, because it takes effect at once and keeps no history,
 * and says how many comments go with the Moment.
 */
export function MomentAdminActions({
  moment,
  onEdit,
}: {
  moment: PublicMoment;
  onEdit: () => void;
}) {
  const refresh = useMomentRefresh();
  const [confirming, setConfirming] = useState(false);

  const remove = useMutation({
    mutationFn: () => orpcClient.moments.admin.remove({ id: moment.id }),
    onSuccess: async () => {
      toast.success(m.moment_admin_deleted());
      setConfirming(false);
      await refresh();
    },
    onError: async (failure) => {
      // Already deleted elsewhere: the page only needs to catch up.
      if (isMomentGone(failure)) {
        toast.error(m.moment_admin_error_not_found());
        setConfirming(false);
        await refresh();
        return;
      }
      toast.error(m.moment_admin_delete_failed());
    },
  });

  return (
    <div className="flex items-center gap-0.5">
      <IconButton label={m.moment_admin_edit()} onClick={onEdit}>
        <Pencil size={16} />
      </IconButton>
      <IconButton
        label={m.moment_admin_delete()}
        tone="danger"
        onClick={() => setConfirming(true)}
      >
        <Trash2 size={16} />
      </IconButton>
      <ConfirmationModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => remove.mutate()}
        title={m.moment_admin_delete_title()}
        message={
          moment.commentCount > 0
            ? m.moment_admin_delete_message_with_comments({
                count: moment.commentCount,
              })
            : m.moment_admin_delete_message()
        }
        confirmLabel={m.moment_admin_delete_confirm()}
        isDanger
        isLoading={remove.isPending}
      />
    </div>
  );
}
