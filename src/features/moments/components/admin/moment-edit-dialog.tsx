import { useMutation } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import { Spinner } from "@/components/ui/spinner";
import { StatusText } from "@/components/ui/status-text";
import type {
  AdminMoment,
  UpdateMomentInput,
} from "@/features/moments/schema/moments.schema";
import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import type { MomentDraft } from "./moment-draft";
import {
  draftOfMoment,
  isEditConflict,
  isMomentGone,
  momentErrorMessage,
  updateInputOf,
} from "./moment-draft";
import { MomentForm } from "./moment-form";
import { useMomentRefresh } from "./use-moment-refresh";

/** The Moment as read, and how many times it was read. */
interface Loaded {
  moment: AdminMoment;
  version: number;
}

/**
 * The composer's form for one existing Moment, in a dialog. It reads the
 * Moment with its `saveToken` when it opens and saves with that token, so a
 * save over a Moment changed elsewhere ends in an Edit Conflict; the Admin
 * is told, and can load the current version, which replaces what was typed.
 */
export function MomentEditDialog({
  momentId,
  open,
  onClose,
}: {
  momentId: number;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const refresh = useMomentRefresh();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useMutation({
    mutationFn: () => orpcClient.moments.admin.get({ id: momentId }),
    onSuccess: (moment) => {
      setLoaded((previous) => ({
        moment,
        version: (previous?.version ?? 0) + 1,
      }));
      setConflict(false);
      setError(null);
    },
    // A Moment deleted elsewhere is still on this page until it refreshes.
    onError: (failure) => {
      if (isMomentGone(failure)) void refresh();
    },
  });
  const { mutate: loadMoment } = load;

  // Every opening starts from a fresh read.
  useEffect(() => {
    if (!open) return;
    setLoaded(null);
    setConflict(false);
    setError(null);
    loadMoment();
  }, [open, loadMoment]);

  const gone = load.isError && isMomentGone(load.error);

  const save = useMutation({
    mutationFn: (input: UpdateMomentInput) =>
      orpcClient.moments.admin.update(input),
    onMutate: () => {
      setError(null);
      setConflict(false);
    },
    onSuccess: async () => {
      toast.success(m.moment_admin_saved());
      await refresh();
      onClose();
    },
    onError: (failure) => {
      if (isEditConflict(failure)) {
        setConflict(true);
      } else {
        setError(momentErrorMessage(failure));
        if (isMomentGone(failure)) void refresh();
      }
    },
  });

  const submit = (draft: MomentDraft) => {
    if (!loaded) return;
    const data = updateInputOf(draftOfMoment(loaded.moment), draft);
    if (!data) {
      onClose();
      return;
    }
    save.mutate({
      id: momentId,
      data,
      saveToken: loaded.moment.saveToken,
    });
  };

  let body;
  if (loaded) {
    body = (
      <MomentForm
        key={loaded.version}
        initial={draftOfMoment(loaded.moment)}
        submitLabel={m.moment_admin_save()}
        submitting={save.isPending}
        requireChange
        locked={conflict}
        error={error}
        notice={
          conflict ? (
            <Callout
              tone="warning"
              icon={TriangleAlert}
              action={
                <Button
                  size="sm"
                  loading={load.isPending}
                  onClick={() => loadMoment()}
                >
                  {m.moment_admin_conflict_load()}
                </Button>
              }
            >
              <p className="font-medium">{m.moment_admin_conflict_title()}</p>
              <p>{m.moment_admin_conflict_desc()}</p>
              {load.isError ? (
                <StatusText error>
                  {isMomentGone(load.error)
                    ? m.moment_admin_error_not_found()
                    : m.moment_admin_conflict_load_failed()}
                </StatusText>
              ) : null}
            </Callout>
          ) : null
        }
        onSubmit={submit}
        onCancel={onClose}
      />
    );
  } else if (load.isError) {
    body = (
      <div className="flex flex-col gap-3">
        <StatusText error>
          {gone
            ? m.moment_admin_error_not_found()
            : m.moment_admin_load_failed()}
        </StatusText>
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={onClose}>
            {m.common_close()}
          </Button>
          {gone ? null : (
            <Button size="sm" variant="primary" onClick={() => loadMoment()}>
              {m.moment_admin_retry()}
            </Button>
          )}
        </div>
      </div>
    );
  } else {
    body = (
      <p
        role="status"
        className="flex items-center gap-2 py-6 text-sm fuwari-text-50"
      >
        <Spinner size={16} />
        {m.moment_admin_loading()}
      </p>
    );
  }

  return (
    <ClientOnly>
      <FuwariModal
        open={open}
        onClose={onClose}
        busy={save.isPending}
        labelledBy={titleId}
        className="fuwari-modal-wide fuwari-modal-top"
      >
        <div className="flex flex-col gap-4 p-5">
          <h2 id={titleId} className="text-lg font-medium fuwari-text-90">
            {m.moment_admin_edit_title()}
          </h2>
          {body}
        </div>
      </FuwariModal>
    </ClientOnly>
  );
}
