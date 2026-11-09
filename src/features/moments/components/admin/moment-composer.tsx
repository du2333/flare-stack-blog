import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { orpcClient } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import type { MomentDraft } from "./moment-draft";
import { createInputOf, EMPTY_DRAFT, momentErrorMessage } from "./moment-draft";
import {
  clearStoredDraft,
  loadStoredDraft,
  saveStoredDraft,
} from "./moment-draft-storage";
import { MomentForm } from "./moment-form";
import { useMomentRefresh } from "./use-moment-refresh";

/**
 * The box above the timeline for a new Moment. What is typed and attached
 * stays in the browser until it is posted, and comes back the next time the
 * box opens. A post is public at once; the form is cleared and the page
 * refreshed when it went through, and kept as it was, with the reason, when
 * it did not.
 */
export function MomentComposer({ onPosted }: { onPosted?: () => void }) {
  const refresh = useMomentRefresh();
  // A new key is a new form: text, images and video start over.
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Read where the box mounts, which is in the browser: only the Admin's
  // session shows it, and that loads there.
  const [initial, setInitial] = useState(
    () => loadStoredDraft() ?? EMPTY_DRAFT,
  );

  const post = useMutation({
    mutationFn: (draft: MomentDraft) =>
      orpcClient.moments.admin.create(createInputOf(draft)),
    onMutate: () => setError(null),
    onSuccess: async () => {
      clearStoredDraft();
      toast.success(m.moment_admin_posted());
      setInitial(EMPTY_DRAFT);
      setFormKey((key) => key + 1);
      await refresh();
      onPosted?.();
    },
    onError: (failure) => setError(momentErrorMessage(failure)),
  });

  return (
    <MomentForm
      key={formKey}
      label={m.moment_admin_composer_label()}
      initial={initial}
      submitLabel={m.moment_admin_post()}
      submitting={post.isPending}
      collapsible
      error={error}
      onSubmit={(draft) => post.mutate(draft)}
      onDraftChange={saveStoredDraft}
    />
  );
}
