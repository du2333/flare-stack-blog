import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createMomentFn,
  deleteMomentFn,
  updateMomentFn,
} from "@/features/moments/api/moments.admin.api";
import type {
  CreateMomentInput,
  MomentItem,
} from "@/features/moments/moments.schema";
import type { MomentType } from "@/lib/db/schema";
import {
  adminMomentsQuery,
  MOMENTS_KEYS,
} from "@/features/moments/queries";
import { getLocale } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";

const searchSchema = z.object({
  page: z.number().optional().default(1).catch(1),
});

export const Route = createFileRoute("/admin/moments/")({
  ssr: false,
  validateSearch: searchSchema,
  component: MomentsAdminPage,
  loader: () => ({ title: m.moments_admin_title() }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.title }],
  }),
});

type Draft = {
  id?: number;
  type: MomentType;
  content: string;
  imagesText: string;
  location: string;
  publishedAt: string;
};

const EMPTY_DRAFT: Draft = {
  type: "moment",
  content: "",
  imagesText: "",
  location: "",
  publishedAt: "",
};

function toDatetimeInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDraft(moment: MomentItem): Draft {
  return {
    id: moment.id,
    type: moment.type,
    content: moment.content,
    imagesText: (moment.images ?? []).join("\n"),
    location: moment.location ?? "",
    publishedAt: toDatetimeInput(moment.publishedAt),
  };
}

function parsedImages(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return m.moments_admin_no_date();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return m.moments_admin_no_date();
  return new Intl.DateTimeFormat(getLocale(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function MomentsAdminPage() {
  const queryClient = useQueryClient();
  const { data, isPending, error } = useQuery(adminMomentsQuery());
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [deleteTarget, setDeleteTarget] = useState<MomentItem | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: MOMENTS_KEYS.all });

  const createMutation = useMutation({
    mutationFn: (input: CreateMomentInput) =>
      createMomentFn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      setDraft(EMPTY_DRAFT);
      toast.success(m.moments_admin_saved());
    },
    onError: () => toast.error(m.moments_admin_error()),
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      id: number;
      type: MomentType;
      content: string;
      images: Array<string>;
      location: string | null;
      publishedAt: Date | null;
    }) => updateMomentFn({ data: input }),
    onSuccess: async () => {
      await invalidate();
      toast.success(m.moments_admin_saved());
    },
    onError: () => toast.error(m.moments_admin_error()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMomentFn({ data: { id } }),
    onSuccess: async () => {
      await invalidate();
      setDeleteTarget(null);
      setDraft((current) =>
        current.id === deleteTarget?.id ? EMPTY_DRAFT : current,
      );
      toast.success(m.moments_admin_deleted());
    },
    onError: () => toast.error(m.moments_admin_error()),
  });

  const items = data?.items ?? [];
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isEditing = draft.id !== undefined;

  const images = useMemo(() => parsedImages(draft.imagesText), [draft.imagesText]);
  const canSave = draft.content.trim().length > 0 && !isSaving;

  const handleSave = () => {
    const content = draft.content.trim();
    if (!content) {
      toast.error(m.moments_admin_error());
      return;
    }
    if (images.length > 9) {
      toast.error(m.moments_admin_images_hint());
      return;
    }

    const payload = {
      type: draft.type,
      content,
      images,
      location: draft.location.trim() || null,
      publishedAt: draft.publishedAt ? new Date(draft.publishedAt) : null,
    };

    if (draft.id !== undefined) {
      updateMutation.mutate({ id: draft.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/30 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">
            {m.moments_admin_title()}
          </h1>
          <p className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
            {m.moments_admin_tag()}
          </p>
        </div>
        <Button
          onClick={() => setDraft(EMPTY_DRAFT)}
          className="rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-[10px] uppercase tracking-widest h-9 px-4"
        >
          <Plus size={14} className="mr-2" />
          {m.moments_admin_new()}
        </Button>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-mono text-muted-foreground">
              {m.moments_admin_list()}
            </h2>
            <span className="text-[10px] font-mono text-muted-foreground">
              {m.moments_admin_count({ count: data?.total ?? 0 })}
            </span>
          </div>

          {isPending ? (
            <div className="h-40 border border-border/30 bg-muted/20 animate-pulse" />
          ) : error ? (
            <p className="text-sm text-destructive">{m.moments_admin_error()}</p>
          ) : items.length === 0 ? (
            <div className="border border-dashed border-border/40 px-6 py-16 text-center">
              <NotebookPen
                className="mx-auto mb-4 text-muted-foreground"
                size={24}
                strokeWidth={1.2}
              />
              <p className="text-sm text-muted-foreground">
                {m.moments_admin_empty()}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/30 border-y border-border/30">
              {items.map((moment) => (
                <li
                  key={moment.id}
                  className="group flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <button
                    type="button"
                    onClick={() => setDraft(toDraft(moment))}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                      <span className="text-foreground">
                        {moment.type === "chatter"
                          ? m.moments_type_chatter()
                          : m.moments_type_moment()}
                      </span>
                      <span>{formatDate(moment.publishedAt)}</span>
                      {(moment.images ?? []).length > 0 ? (
                        <span>
                          {m.moments_admin_images_count({
                            count: (moment.images ?? []).length,
                          })}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm text-foreground">
                      {moment.content || m.moments_admin_untitled()}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDraft(toDraft(moment))}
                      aria-label={m.moments_admin_edit()}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil size={13} strokeWidth={1.4} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(moment)}
                      aria-label={m.moments_admin_delete()}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={13} strokeWidth={1.4} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="h-fit border border-border/30 bg-background p-5 xl:sticky xl:top-24">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-border/30 pb-3">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-mono text-foreground">
              {isEditing ? m.moments_admin_edit() : m.moments_admin_new()}
            </h2>
            {isEditing ? (
              <button
                type="button"
                onClick={() => setDraft(EMPTY_DRAFT)}
                className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                {m.moments_admin_cancel()}
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {m.moments_admin_type()}
              </span>
              <select
                value={draft.type}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    type: event.target.value as MomentType,
                  }))
                }
                className="h-9 w-full border border-border/40 bg-background px-3 text-sm text-foreground outline-none focus:border-foreground"
              >
                <option value="moment">{m.moments_type_moment()}</option>
                <option value="chatter">{m.moments_type_chatter()}</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {m.moments_admin_content()}
              </span>
              <Textarea
                value={draft.content}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                placeholder={m.moments_admin_content_placeholder()}
                rows={6}
                className="min-h-28 resize-y rounded-none border-border/40 bg-background text-sm focus-visible:ring-0 focus-visible:border-foreground"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {m.moments_admin_images()}
              </span>
              <Textarea
                value={draft.imagesText}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    imagesText: event.target.value,
                  }))
                }
                rows={3}
                className="resize-y rounded-none border-border/40 bg-background font-mono text-xs focus-visible:ring-0 focus-visible:border-foreground"
              />
              <span className="block text-[10px] leading-relaxed text-muted-foreground">
                {m.moments_admin_images_hint()}
              </span>
              {images.length > 0 ? (
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {images.slice(0, 8).map((src, index) => (
                    <img
                      key={`${src}-${index}`}
                      src={src}
                      alt=""
                      className="aspect-square w-full border border-border/30 object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : null}
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {m.moments_admin_location()}
              </span>
              <Input
                value={draft.location}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                className="h-9 rounded-none border-border/40 bg-background text-sm focus-visible:ring-0 focus-visible:border-foreground"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {m.moments_admin_published_at()}
              </span>
              <Input
                type="datetime-local"
                value={draft.publishedAt}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    publishedAt: event.target.value,
                  }))
                }
                className="h-9 rounded-none border-border/40 bg-background font-mono text-xs focus-visible:ring-0 focus-visible:border-foreground"
              />
            </label>

            <Button
              onClick={handleSave}
              disabled={!canSave}
              className="h-10 w-full rounded-none bg-foreground font-mono text-[10px] uppercase tracking-[0.2em] text-background hover:bg-foreground/90"
            >
              {isSaving ? m.moments_admin_saving() : m.moments_admin_save()}
            </Button>
          </div>
        </aside>
      </div>

      <ConfirmationModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        title={m.moments_admin_delete()}
        message={m.moments_admin_delete_confirm()}
        confirmLabel={m.moments_admin_delete()}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
