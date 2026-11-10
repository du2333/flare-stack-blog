import { Bot } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/page-heading";
import { isPairedApiKey } from "@/features/agent-pairing/agent-pairing.schema";
import {
  type ApiKeyListItem,
  useApiKeys,
} from "@/features/api-keys/hooks/use-api-keys";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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
            <Button onClick={() => void reload()}>
              {m.settings_design_retry()}
            </Button>
          }
        />
      ) : isLoading ? (
        <EmptyState
          size="compact"
          description={m.settings_api_keys_loading()}
        />
      ) : agents.length === 0 ? (
        <EmptyState
          size="compact"
          icon={Bot}
          description={m.agent_skill_agents_empty()}
        />
      ) : (
        <div className="agent-skill-table">
          <table>
            <thead>
              <tr>
                <th>{m.settings_api_keys_name_label()}</th>
                <th>{m.agent_skill_agents_paired_at()}</th>
                <th>{m.agent_skill_agents_last_used()}</th>
                <th>
                  <span className="sr-only">
                    {m.settings_api_keys_delete()}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {agents.map((key) => {
                const name = pairedAgentName(key);
                return (
                  <tr key={key.id}>
                    <td>
                      <strong>{name}</strong>
                    </td>
                    <td>{formatDate(key.createdAt, { includeTime: true })}</td>
                    <td>
                      {key.lastRequest
                        ? formatDate(key.lastRequest, { includeTime: true })
                        : m.agent_skill_agents_never_used()}
                    </td>
                    <td>
                      <Button
                        variant="plain"
                        tone="danger"
                        size="sm"
                        disabled={isDeleting}
                        onClick={() => setPendingDelete({ id: key.id, name })}
                      >
                        {m.settings_api_keys_delete()}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
