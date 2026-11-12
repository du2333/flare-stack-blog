import { Bot, Trash2 } from "lucide-react";
import { useState } from "react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/page-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { isPairedApiKey } from "@/features/agent-pairing/agent-pairing.schema";
import {
  type ApiKeyListItem,
  useApiKeys,
} from "@/features/api-keys/hooks/use-api-keys";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import "@/features/api-keys/components/api-key-settings.css";

/** The agent's own name, not the key's `<agent> · <date>`; pairing time has its column. */
function pairedAgentName(key: ApiKeyListItem) {
  const agentName = (key.metadata as { agentName?: unknown } | null)?.agentName;
  return (
    (typeof agentName === "string" && agentName.trim()) ||
    key.name ||
    m.settings_api_keys_unnamed()
  );
}

export function PairedAgents() {
  const { keys, isLoading, isError, reload, deleteKey, isDeleting } =
    useApiKeys();
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const agents = keys.filter((key) => isPairedApiKey(key.metadata));
  return (
    <section className="agent-skill-agents" aria-busy={isLoading}>
      <SectionHeading
        level={2}
        size="md"
        title={m.agent_skill_agents_title()}
        description={m.agent_skill_agents_hint()}
      />
      {isError ? (
        <EmptyState
          size="compact"
          description={m.settings_design_load_failed()}
          action={
            <Button variant="outline" size="sm" onClick={() => void reload()}>
              {m.settings_design_retry()}
            </Button>
          }
        />
      ) : isLoading ? (
        <div role="status" aria-label={m.settings_api_keys_loading()}>
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="admin-list-row key-row key-grid agent-skill-grid"
              aria-hidden
            >
              <div className="key-name">
                <Skeleton className="h-4 w-1/3 rounded" />
              </div>
              <Skeleton className="key-cell h-3 w-24 rounded" />
              <Skeleton className="key-cell h-3 w-24 rounded" />
              <span />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <EmptyState
          size="compact"
          icon={Bot}
          description={m.agent_skill_agents_empty()}
        />
      ) : (
        <div role="table" aria-label={m.agent_skill_agents_title()}>
          <div role="row" className="key-head key-grid agent-skill-grid">
            <span role="columnheader">{m.settings_api_keys_name_label()}</span>
            <span role="columnheader" className="key-cell">
              {m.agent_skill_agents_paired_at()}
            </span>
            <span role="columnheader" className="key-cell">
              {m.agent_skill_agents_last_used()}
            </span>
            <span role="columnheader" className="sr-only">
              {m.settings_api_keys_delete()}
            </span>
          </div>
          {agents.map((key) => {
            const name = pairedAgentName(key);
            const pairedAt = formatDate(key.createdAt, { includeTime: true });
            const lastUsed = key.lastRequest
              ? formatDate(key.lastRequest, { includeTime: true })
              : m.agent_skill_agents_never_used();
            return (
              <div
                key={key.id}
                role="row"
                className="admin-list-row key-row key-grid agent-skill-grid"
              >
                <div role="cell" className="key-name">
                  <span className="key-name-line">
                    <strong title={name}>{name}</strong>
                  </span>
                  <span className="key-summary">
                    {formatDate(key.createdAt)} ·{" "}
                    {m.agent_skill_agents_last_used()} {lastUsed}
                  </span>
                </div>
                <div role="cell" className="key-cell">
                  {pairedAt}
                </div>
                <div role="cell" className="key-cell">
                  {lastUsed}
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
                        onSelect: () => setPendingDelete({ id: key.id, name }),
                      },
                    ]}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
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
      />
    </section>
  );
}
