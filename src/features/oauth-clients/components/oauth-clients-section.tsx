import {
  Check,
  Copy,
  Edit2,
  ExternalLink,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OAUTH_MANAGED_SCOPES } from "@/features/oauth-provider/oauth-provider.shared";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useOAuthClients } from "../hooks/use-oauth-clients";
import type {
  OAuthConnectionRecord,
  RenameOAuthClientInput,
} from "../schema/oauth-client.schema";

function getManagedScopes(scopes: string[]) {
  return scopes.filter((scope) =>
    OAUTH_MANAGED_SCOPES.includes(
      scope as (typeof OAUTH_MANAGED_SCOPES)[number],
    ),
  );
}

function MCPEndpointCard({ endpoint }: { endpoint: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      toast.success(m.settings_mcp_toast_endpoint_copied?.() || "Copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  return (
    <Card className="border-border/30 bg-muted/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          {m.settings_mcp_endpoint_label()}
        </CardTitle>
        <CardDescription>
          {m.settings_mcp_endpoint_desc?.() ||
            "Use this endpoint to connect MCP clients to your blog."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="group relative flex items-center gap-2 rounded-none border border-border/20 bg-background/40 p-3">
          <code className="flex-1 break-all font-mono text-xs text-muted-foreground">
            {endpoint}
          </code>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-none border border-border/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-[10px] uppercase font-mono tracking-wider">
                  {copied ? "Copied" : "Copy Endpoint"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

function OAuthConnectionCard({
  connection,
  onDelete,
  onRename,
}: {
  connection: OAuthConnectionRecord;
  onDelete: (consentId: string) => void;
  onRename: (input: RenameOAuthClientInput) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [clientName, setClientName] = useState(connection.clientName ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const managedScopes = getManagedScopes(connection.scopes);

  const handleRename = () => {
    if (clientName.trim() === connection.clientName) {
      setIsEditing(false);
      return;
    }
    onRename({
      clientId: connection.clientId,
      clientName: clientName.trim(),
    });
    setIsEditing(false);
  };

  return (
    <Card className="group border-border/20 bg-card/40 hover:border-border/40 transition-colors">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-6">
        <div className="space-y-1.5 flex-1 min-w-0 mr-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-muted/40 border border-border/10 flex items-center justify-center overflow-hidden">
              {connection.clientIcon ? (
                <img
                  src={connection.clientIcon}
                  alt={connection.clientName ?? "Client"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ShieldCheck className="h-4 w-4 text-muted-foreground/30" />
              )}
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2 w-full max-w-sm">
                <Input
                  autoFocus
                  value={clientName}
                  className="h-8 text-lg font-serif"
                  onChange={(e) => setClientName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") {
                      setClientName(connection.clientName ?? "");
                      setIsEditing(false);
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleRename}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    setClientName(connection.clientName ?? "");
                    setIsEditing(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <CardTitle className="truncate">
                  {connection.clientName || m.settings_mcp_connection_unnamed()}
                </CardTitle>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
          <CardDescription className="font-mono text-[10px] break-all pb-1 uppercase tracking-tight">
            ID: {connection.clientId}
          </CardDescription>
        </div>

        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-8 w-8 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded-lg sm:rounded-none"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timeline */}
          <div className="space-y-2">
            <h5 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">
              {m.settings_mcp_connection_timeline?.() || "Timeline"}
            </h5>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {m.settings_mcp_connection_connected_label()}
                </span>
                <span className="font-mono text-muted-foreground/80">
                  {formatDate(connection.createdAt, { includeTime: true })}
                </span>
              </div>
            </div>
          </div>

          {/* Scopes */}
          <div className="space-y-2">
            <h5 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">
              {m.settings_mcp_connection_granted_scopes()}
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {managedScopes.length > 0 ? (
                managedScopes.map((scope) => (
                  <Badge
                    key={scope}
                    variant="outline"
                    className="h-5 px-1.5 text-[9px] lowercase border-border/40 font-mono text-muted-foreground hover:bg-muted/50"
                  >
                    {scope}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground/60 italic">
                  {m.settings_mcp_connection_no_business_scopes()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Redirect URIs */}
        {connection.redirectUris.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground/60">
              {m.settings_mcp_connection_redirect_uris()}
            </h5>
            <div className="space-y-1.5 overflow-hidden">
              {connection.redirectUris.map((uri) => (
                <div
                  key={uri}
                  className="flex items-center gap-2 text-xs text-muted-foreground group/uri"
                >
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
                  <span className="break-all font-mono opacity-80 group-hover/uri:opacity-100 transition-opacity">
                    {uri}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <ConfirmationModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await onDelete(connection.consentId);
          setDeleteOpen(false);
        }}
        title={m.settings_mcp_connection_disconnect_title()}
        message={m.settings_mcp_connection_disconnect_desc({
          client: connection.clientName || connection.clientId,
        })}
        confirmLabel={m.settings_mcp_connection_disconnect_btn()}
        isDanger
      />
    </Card>
  );
}

export function OAuthClientsSection() {
  const { connections, deleteConnection, isLoading, renameClient } =
    useOAuthClients();
  const [baseUrl] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );

  const connectionCountLabel = useMemo(() => {
    return m.settings_mcp_connected_count({ count: connections.length });
  }, [connections.length]);

  const mcpEndpoint = baseUrl ? `${baseUrl}/mcp` : "/mcp";

  const handleRename = (input: RenameOAuthClientInput) => {
    renameClient(
      { data: input },
      {
        onSuccess: () => {
          toast.success(m.settings_mcp_toast_client_renamed());
        },
      },
    );
  };

  const handleDelete = (consentId: string) => {
    deleteConnection(
      { data: { consentId } },
      {
        onSuccess: () => {
          toast.success(m.settings_mcp_toast_disconnected());
        },
      },
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="space-y-8">
        {/* Configuration Card */}
        <MCPEndpointCard endpoint={mcpEndpoint} />

        {/* Header Section */}
        <section className="space-y-2">
          <h2 className="text-xl font-serif text-foreground tracking-tight">
            {m.settings_mcp_connections_title()}
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {m.settings_mcp_connections_desc()}
          </p>
          <div className="pt-2">
            <Badge variant="secondary" className="px-3 py-1 font-mono">
              {connectionCountLabel}
            </Badge>
          </div>
        </section>

        {/* Connections List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-48 w-full animate-pulse bg-muted/20"
                />
              ))}
            </div>
          ) : connections.length > 0 ? (
            connections.map((connection) => (
              <OAuthConnectionCard
                key={connection.consentId}
                connection={connection}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-border/20 bg-muted/5">
              <div className="h-12 w-12 rounded-full bg-muted/10 flex items-center justify-center mb-4 text-muted-foreground/20">
                <ExternalLink className="h-6 w-6" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {m.settings_mcp_empty_connections()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
