import { Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { SETTINGS_FIELD_CLASS } from "@/features/config/components/admin/settings-pages";
import { useApiKeys } from "@/features/api-keys/hooks/use-api-keys";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export function ApiKeySettingsSection() {
  const { keys, isLoading, createKey, isCreating, deleteKey, isDeleting } =
    useApiKeys();
  const [name, setName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const trimmedName = name.trim();

  const handleCreate = async () => {
    if (!trimmedName || isCreating) return;
    const created = await createKey(trimmedName);
    setName("");
    setRevealedKey(created.key);
  };

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(m.settings_api_keys_copied());
  };

  return (
    <div className="space-y-4">
      {revealedKey ? (
        <div className="rounded-2xl bg-(--fuwari-success-bg) p-4 space-y-2">
          <p className="text-sm font-medium text-(--fuwari-success-fg)">
            {m.settings_api_keys_created_title()}
          </p>
          <p className="text-xs text-(--fuwari-success-fg)">
            {m.settings_api_keys_created_hint()}
          </p>
          <code className="block text-xs break-all fuwari-text-90">
            {revealedKey}
          </code>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleCopy(revealedKey)}
              className="fuwari-btn-regular rounded-xl h-8 px-3 text-sm font-medium gap-1.5"
            >
              <Copy size={12} />
              {m.settings_api_keys_copy()}
            </button>
            <button
              type="button"
              onClick={() => setRevealedKey(null)}
              className="h-8 px-3 text-sm fuwari-text-50"
            >
              {m.settings_api_keys_dismiss()}
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <label className="grid gap-1.5 text-sm fuwari-text-50 flex-1 min-w-0">
          {m.settings_api_keys_name_label()}
          <input
            value={name}
            maxLength={32}
            placeholder={m.settings_api_keys_name_ph()}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleCreate();
              }
            }}
            className={SETTINGS_FIELD_CLASS}
          />
        </label>
        <button
          type="button"
          disabled={!trimmedName || isCreating}
          onClick={() => void handleCreate()}
          className="fuwari-btn-primary rounded-xl h-10 px-4 text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
        >
          {isCreating ? <Loader2 size={14} className="animate-spin" /> : null}
          {isCreating
            ? m.settings_api_keys_creating()
            : m.settings_api_keys_create()}
        </button>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm fuwari-text-50">
          {m.settings_api_keys_loading()}
        </p>
      ) : keys.length === 0 ? (
        <p className="py-10 text-center text-sm fuwari-text-50">
          {m.settings_api_keys_empty()}
        </p>
      ) : (
        <div>
          {keys.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-3.5 border-b border-(--fuwari-input-border) last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium fuwari-text-90 truncate">
                  {item.name || m.settings_api_keys_unnamed()}
                </p>
                <p className="text-xs fuwari-text-50">
                  {item.start ? `${item.start}… · ` : null}
                  {m.settings_api_keys_created_at({
                    date: formatDate(item.createdAt, { includeTime: true }),
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPendingDelete({
                    id: item.id,
                    name: item.name || m.settings_api_keys_unnamed(),
                  })
                }
                className="h-8 px-3 text-sm fuwari-text-50 hover:text-(--fuwari-danger-fg)"
              >
                {m.settings_api_keys_delete()}
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteKey(pendingDelete.id);
          setPendingDelete(null);
        }}
        title={m.settings_api_keys_delete_title()}
        message={m.settings_api_keys_delete_desc({
          name: pendingDelete?.name ?? "",
        })}
        confirmLabel={m.settings_api_keys_delete_confirm()}
        isDanger
        isLoading={isDeleting}
      />
    </div>
  );
}
