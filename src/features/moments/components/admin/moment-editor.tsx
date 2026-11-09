import { useMutation } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Spinner } from "@/components/ui/spinner";
import { StatusText } from "@/components/ui/status-text";
import type {
  AdminMoment,
  PublicMoment,
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
 * The composer for one existing Moment, in the place of its card. It starts
 * from the card's text and attachments, read-only, while it reads the Moment
 * with its `saveToken`, and saves with that token, so a save over a Moment
 * changed elsewhere ends in an Edit Conflict; the Admin is told, and can load
 * the current version, which replaces what was typed. Saving, or Cancel,
 * hands the place back to the card through `onDone`.
 */
export function MomentEditor({
  moment,
  onDone,
}: {
  moment: PublicMoment;
  onDone: () => void;
}) {
  const refresh = useMomentRefresh();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useMutation({
    mutationFn: () => orpcClient.moments.admin.get({ id: moment.id }),
    onSuccess: (read) => {
      setLoaded((previous) => ({
        moment: read,
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

  // Every editing starts from a fresh read.
  useEffect(() => {
    loadMoment();
  }, [loadMoment]);

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
      onDone();
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
      onDone();
      return;
    }
    save.mutate({
      id: moment.id,
      data,
      saveToken: loaded.moment.saveToken,
    });
  };

  let notice;
  if (conflict) {
    notice = (
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
            {gone
              ? m.moment_admin_error_not_found()
              : m.moment_admin_conflict_load_failed()}
          </StatusText>
        ) : null}
      </Callout>
    );
  } else if (!loaded && load.isError) {
    notice = (
      <div className="flex flex-wrap items-center gap-2">
        <StatusText error className="mr-auto">
          {gone
            ? m.moment_admin_error_not_found()
            : m.moment_admin_load_failed()}
        </StatusText>
        {gone ? null : (
          <Button size="sm" onClick={() => loadMoment()}>
            {m.moment_admin_retry()}
          </Button>
        )}
      </div>
    );
  } else if (!loaded) {
    notice = (
      <p
        role="status"
        className="flex items-center gap-2 text-xs fuwari-text-50"
      >
        <Spinner size={14} />
        {m.moment_admin_loading()}
      </p>
    );
  }

  return (
    <MomentForm
      // A new read is a new form: what it holds replaces what was typed.
      key={loaded?.version ?? 0}
      label={m.moment_admin_edit()}
      initial={draftOfMoment(loaded?.moment ?? moment)}
      submitLabel={m.moment_admin_save()}
      submitting={save.isPending}
      requireChange
      locked={conflict}
      loading={!loaded}
      autoFocus={loaded !== null}
      error={error}
      notice={notice}
      onSubmit={submit}
      onCancel={onDone}
    />
  );
}
