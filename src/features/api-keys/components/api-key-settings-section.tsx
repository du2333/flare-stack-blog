import { ClientOnly, Link } from "@tanstack/react-router";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Fragment, useRef, useState } from "react";
import { toast } from "sonner";
import { useAdminPrimaryAction } from "@/components/admin/admin-chrome";
import { ActionMenu } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { isPairedApiKey } from "@/features/agent-pairing/agent-pairing.schema";
import { useApiKeys } from "@/features/api-keys/hooks/use-api-keys";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import "./api-key-settings.css";

/** One quiet line above the list: what keys are for, and where agents go instead. */
function KeysNote() {
  const link = (
    <Link
      to="/admin/access/agent-skill"
      className="font-medium underline underline-offset-2"
    >
      {m.settings_api_keys_agent_pointer_link()}
    </Link>
  );
  // The slot goes in as a \0-wrapped name so each locale keeps its own word order.
  const parts = m
    .settings_api_keys_agent_pointer({ link: "\0link\0" })
    .split("\0");
  return (
    <p className="key-note">
      {m.settings_design_keys_hint()}{" "}
      {parts.map((part, index) =>
        index % 2 ? <Fragment key={part}>{link}</Fragment> : part,
      )}
    </p>
  );
}

export function ApiKeySettingsSection() {
  const {
    keys,
    isLoading,
    isError,
    reload,
    createKey,
    isCreating,
    deleteKey,
    isDeleting,
  } = useApiKeys();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    if (isCreating) return;
    setOpen(false);
    setRevealedKey(null);
  };
  const openCreate = () => {
    setName("");
    setRevealedKey(null);
    setOpen(true);
  };
  // The frame's header (and the phone top bar) shows it.
  useAdminPrimaryAction({
    label: m.settings_api_keys_create(),
    icon: <Plus size={16} />,
    ref: createRef,
    onClick: openCreate,
  });
  const create = async () => {
    if (!name.trim() || isCreating) return;
    try {
      const created = await createKey(name.trim());
      setRevealedKey(created.key);
      setName("");
    } catch {
      /* Mutation displays the failure. */
    }
  };
  return (
    <div className="settings-keys">
      <KeysNote />
      <div className="key-list" aria-busy={isLoading}>
        {isError ? (
          <EmptyState
            description={m.settings_design_load_failed()}
            action={
              <Button onClick={() => void reload()}>
                {m.settings_design_retry()}
              </Button>
            }
          />
        ) : isLoading ? (
          <div role="status" aria-label={m.settings_api_keys_loading()}>
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="admin-list-row key-row" aria-hidden>
                <Skeleton className="h-4 w-1/3 rounded" />
                <Skeleton className="ml-auto h-3 w-24 rounded" />
              </div>
            ))}
          </div>
        ) : keys.length === 0 ? (
          <EmptyState
            size="compact"
            description={m.settings_api_keys_empty()}
            action={
              <Button onClick={openCreate}>
                {m.settings_api_keys_create()}
              </Button>
            }
          />
        ) : (
          <div role="table" aria-label={m.settings_nav_api_keys()}>
            <div role="row" className="key-head key-grid">
              <span role="columnheader">
                {m.settings_api_keys_name_label()}
              </span>
              <span role="columnheader" className="key-cell">
                {m.settings_design_key_prefix()}
              </span>
              <span role="columnheader" className="key-cell">
                {m.settings_design_created_at()}
              </span>
              <span role="columnheader" className="key-cell">
                {m.settings_api_keys_last_used()}
              </span>
              <span role="columnheader" className="sr-only">
                {m.settings_api_keys_delete()}
              </span>
            </div>
            {keys.map((key) => {
              const name = key.name || m.settings_api_keys_unnamed();
              const created = formatDate(key.createdAt, { includeTime: true });
              const lastUsed = key.lastRequest
                ? formatDate(key.lastRequest, { includeTime: true })
                : m.settings_api_keys_never_used();
              return (
                <div
                  key={key.id}
                  role="row"
                  className="admin-list-row key-row key-grid"
                >
                  <div role="cell" className="key-name">
                    <span className="key-name-line">
                      <strong title={name}>{name}</strong>
                      {isPairedApiKey(key.metadata) && (
                        <Badge tone="primary" size="sm">
                          {m.settings_api_keys_paired_badge()}
                        </Badge>
                      )}
                    </span>
                    <ClientOnly fallback={null}>
                      <span className="key-summary">
                        {formatDate(key.createdAt)} ·{" "}
                        {m.settings_api_keys_last_used()} {lastUsed}
                      </span>
                    </ClientOnly>
                  </div>
                  <div role="cell" className="key-cell">
                    <code>{key.start ? `${key.start}…` : "—"}</code>
                  </div>
                  <div role="cell" className="key-cell">
                    <ClientOnly fallback="—">{created}</ClientOnly>
                  </div>
                  <div role="cell" className="key-cell">
                    <ClientOnly fallback="—">{lastUsed}</ClientOnly>
                  </div>
                  <div role="cell" className="key-actions">
                    <ActionMenu
                      label={m.settings_api_keys_row_actions({ name })}
                      placement="bottom-end"
                      disabled={isDeleting}
                      items={[
                        {
                          label: m.settings_api_keys_delete(),
                          icon: Trash2,
                          danger: true,
                          onSelect: () =>
                            setPendingDelete({ id: key.id, name }),
                        },
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {isLoading || isError || keys.length === 0 ? null : (
        <p className="key-count">
          {m.settings_design_key_count({ count: keys.length })}
        </p>
      )}
      <ClientOnly>
        <FuwariModal
          open={open}
          onClose={close}
          busy={isCreating}
          labelledBy="create-api-key-title"
          initialFocus={() => inputRef.current}
          returnFocus={() => createRef.current}
        >
          <div className="p-6">
            <h2
              id="create-api-key-title"
              className="text-lg font-semibold fuwari-text-90"
            >
              {revealedKey
                ? m.settings_api_keys_created_title()
                : m.settings_api_keys_create()}
            </h2>
            {revealedKey ? (
              <div className="mt-4 space-y-4">
                <p className="text-sm fuwari-text-50">
                  {m.settings_api_keys_created_hint()}
                </p>
                <code className="block break-all rounded-xl bg-(--fuwari-btn-regular-bg) p-4 text-sm">
                  {revealedKey}
                </code>
                <div className="flex justify-end gap-2">
                  <Button onClick={close}>
                    {m.settings_api_keys_dismiss()}
                  </Button>
                  <Button
                    variant="primary"
                    icon={<Copy size={16} />}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(revealedKey);
                        toast.success(m.settings_api_keys_copied());
                      } catch {
                        toast.error(m.settings_design_copy_failed());
                      }
                    }}
                  >
                    {m.settings_api_keys_copy()}
                  </Button>
                </div>
              </div>
            ) : (
              <form
                className="mt-5 space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void create();
                }}
              >
                <FormField label={m.settings_api_keys_name_label()}>
                  <Input
                    ref={inputRef}
                    value={name}
                    disabled={isCreating}
                    maxLength={32}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={m.settings_api_keys_name_ph()}
                  />
                </FormField>
                <div className="flex justify-end gap-2">
                  <Button onClick={close} disabled={isCreating}>
                    {m.common_cancel()}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!name.trim()}
                    loading={isCreating}
                  >
                    {m.settings_api_keys_create()}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </FuwariModal>
      </ClientOnly>
      <ConfirmationModal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete || isDeleting) return;
          try {
            await deleteKey(pendingDelete.id);
            setPendingDelete(null);
          } catch {
            /* Keep the dialog for retry. */
          }
        }}
        title={m.settings_api_keys_delete_title()}
        message={m.settings_api_keys_delete_desc({
          name: pendingDelete?.name ?? "",
        })}
        confirmLabel={m.settings_api_keys_delete_confirm()}
        isDanger
        isLoading={isDeleting}
        fallbackFocus={() => createRef.current}
      />
    </div>
  );
}
