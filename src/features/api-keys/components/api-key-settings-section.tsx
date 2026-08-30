import { Copy, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {m.settings_api_keys_doc()}
      </p>

      {revealedKey ? (
        <div className="space-y-4 border border-border/30 p-8 bg-background/50">
          <h5 className="text-sm font-medium text-foreground">
            {m.settings_api_keys_created_title()}
          </h5>
          <p className="text-sm text-muted-foreground">
            {m.settings_api_keys_created_hint()}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
              {revealedKey}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-none font-mono text-[10px] uppercase tracking-widest"
              onClick={() => handleCopy(revealedKey)}
            >
              <Copy size={12} className="mr-2" />
              {m.settings_api_keys_copy()}
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-none px-0 font-mono text-[10px] uppercase tracking-widest"
            onClick={() => setRevealedKey(null)}
          >
            {m.settings_api_keys_dismiss()}
          </Button>
        </div>
      ) : null}

      <div className="space-y-6 border border-border/30 p-8 bg-background/50">
        <h5 className="text-sm font-medium text-foreground">
          {m.settings_api_keys_create_title()}
        </h5>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-3">
            <label className="text-sm text-muted-foreground">
              {m.settings_api_keys_name_label()}
            </label>
            <Input
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
            />
          </div>
          <Button
            type="button"
            disabled={!trimmedName || isCreating}
            className="h-11 rounded-none px-8 font-mono text-[11px] uppercase tracking-[0.2em]"
            onClick={() => void handleCreate()}
          >
            {isCreating ? (
              <Loader2 size={14} className="mr-3 animate-spin" />
            ) : null}
            {isCreating
              ? m.settings_api_keys_creating()
              : m.settings_api_keys_create()}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground font-mono">
          {m.settings_api_keys_loading()}
        </p>
      ) : keys.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <p className="text-sm text-foreground">
            {m.settings_api_keys_empty()}
          </p>
          <p className="text-sm text-muted-foreground">
            {m.settings_api_keys_empty_hint()}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border/30 border border-border/30">
          {keys.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-4 px-4 py-4 md:px-6"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {item.name || m.settings_api_keys_unnamed()}
                </p>
                <p className="text-[11px] font-mono text-muted-foreground">
                  {item.start ? `${item.start}…` : null}
                  {item.start ? " · " : null}
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
                className="h-8 px-3 text-[10px] font-mono uppercase tracking-widest border border-border/30 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors inline-flex items-center gap-2"
              >
                <Trash2 size={12} />
                {m.settings_api_keys_delete()}
              </button>
            </li>
          ))}
        </ul>
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
