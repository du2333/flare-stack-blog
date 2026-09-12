import { ClientOnly } from "@tanstack/react-router";
import { Copy, KeyRound, Loader2, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { FuwariModal } from "@/components/ui/fuwari-modal";
import { SETTINGS_FIELD_CLASS } from "@/features/config/components/admin/settings-pages";
import { useApiKeys } from "@/features/api-keys/hooks/use-api-keys";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import "./api-key-settings.css";

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
      <div className="settings-section-heading">
        <div>
          <h2>{m.settings_nav_api_keys()}</h2>
          <p className="settings-muted">{m.settings_design_keys_hint()}</p>
        </div>
        <button
          ref={createRef}
          type="button"
          className="settings-button fuwari-btn-primary"
          onClick={() => {
            setName("");
            setRevealedKey(null);
            setOpen(true);
          }}
        >
          <Plus size={16} />
          {m.settings_api_keys_create()}
        </button>
      </div>
      <div className="settings-key-list" aria-busy={isLoading}>
        {isError ? (
          <div className="settings-key-empty">
            <p>{m.settings_design_load_failed()}</p>
            <button
              type="button"
              className="settings-button fuwari-btn-regular"
              onClick={() => void reload()}
            >
              {m.settings_design_retry()}
            </button>
          </div>
        ) : isLoading ? (
          <p className="settings-key-empty">{m.settings_api_keys_loading()}</p>
        ) : keys.length === 0 ? (
          <div className="settings-key-empty">
            <KeyRound size={30} />
            <p>{m.settings_api_keys_empty()}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{m.settings_api_keys_name_label()}</th>
                <th>{m.settings_design_key_prefix()}</th>
                <th>{m.settings_design_created_at()}</th>
                <th>
                  <span className="sr-only">
                    {m.settings_api_keys_delete()}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id}>
                  <td>
                    <strong>{key.name || m.settings_api_keys_unnamed()}</strong>
                  </td>
                  <td>
                    <code>{key.start ? `${key.start}…` : "—"}</code>
                  </td>
                  <td>
                    <ClientOnly fallback="—">
                      {formatDate(key.createdAt, { includeTime: true })}
                    </ClientOnly>
                  </td>
                  <td>
                    <button
                      type="button"
                      disabled={isDeleting}
                      className="settings-key-revoke"
                      onClick={() =>
                        setPendingDelete({
                          id: key.id,
                          name: key.name || m.settings_api_keys_unnamed(),
                        })
                      }
                    >
                      {m.settings_api_keys_delete()}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <footer className="settings-key-footer">
        <p>
          {m.settings_api_keys_created_hint()}
          <br />
          {m.settings_design_immediate()}
        </p>
        <span>
          {isLoading || isError
            ? "—"
            : m.settings_design_key_count({ count: keys.length })}
        </span>
      </footer>
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
                  <button
                    type="button"
                    className="settings-button fuwari-btn-regular"
                    onClick={close}
                  >
                    {m.settings_api_keys_dismiss()}
                  </button>
                  <button
                    type="button"
                    className="settings-button fuwari-btn-primary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(revealedKey);
                        toast.success(m.settings_api_keys_copied());
                      } catch {
                        toast.error(m.settings_design_copy_failed());
                      }
                    }}
                  >
                    <Copy size={16} />
                    {m.settings_api_keys_copy()}
                  </button>
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
                <label className="grid gap-2 text-sm fuwari-text-75">
                  {m.settings_api_keys_name_label()}
                  <input
                    ref={inputRef}
                    value={name}
                    disabled={isCreating}
                    maxLength={32}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={m.settings_api_keys_name_ph()}
                    className={SETTINGS_FIELD_CLASS}
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    disabled={isCreating}
                    className="settings-button fuwari-btn-regular"
                  >
                    {m.common_cancel()}
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || isCreating}
                    className="settings-button fuwari-btn-primary"
                  >
                    {isCreating && (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    {m.settings_api_keys_create()}
                  </button>
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
