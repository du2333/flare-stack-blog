import { Link } from "@tanstack/react-router";
import { ExternalLink, Terminal } from "lucide-react";
import type { SubmitFriendLinkPageProps } from "@/features/theme/contract/pages/friend-links";
import { formatDate } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { FriendLinkSubmitForm } from "./form";

export function SubmitFriendLinkPage(props: SubmitFriendLinkPageProps) {
  const { myLinks, form } = props;
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-6 md:px-0 py-12 md:py-20 space-y-20">
      <header className="space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight text-foreground">
              {m.friend_links_title()}
            </h1>
            <div className="space-y-4 max-w-2xl text-base md:text-lg text-muted-foreground font-light leading-relaxed">
              <p>{m.friend_link_submit_desc()}</p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Terminal size={14} />
              cd /home
            </Link>
          </div>
        </div>
      </header>

      <div className="w-full h-px bg-border/40" />

      <section className="space-y-8">
        <h3 className="text-lg font-serif font-medium text-foreground">
          {m.friend_link_submit_form_title()}
        </h3>
        <FriendLinkSubmitForm form={form} />
      </section>

      {myLinks.length > 0 && (
        <>
          <div className="w-full h-px bg-border/40" />

          <section className="space-y-8">
            <h3 className="text-lg font-serif font-medium text-foreground">
              {m.friend_link_my_submissions()}
            </h3>
            <div className="space-y-4">
              {myLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-start justify-between py-4 border-b border-border/30"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-serif font-medium">
                        {link.siteName}
                      </span>
                      <FriendLinkStatusBadge status={link.status} />
                    </div>
                    <a
                      href={link.siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <ExternalLink size={10} className="shrink-0" />
                      <span className="truncate">{link.siteUrl}</span>
                    </a>
                    {link.rejectionReason && (
                      <p className="text-[11px] text-orange-500 font-mono">
                        {m.friend_link_rejection_reason()}:{" "}
                        {link.rejectionReason}
                      </p>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground shrink-0 ml-4">
                    {formatDate(link.createdAt).split(" ")[0]}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function FriendLinkStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    approved: m.friend_link_status_approved(),
    pending: m.friend_link_status_pending(),
    rejected: m.friend_link_status_rejected(),
  };

  const styles: Record<string, string> = {
    approved: "text-green-600 border-green-600/30",
    pending: "text-amber-500 border-amber-500/30",
    rejected: "text-red-500 border-red-500/30",
  };

  return (
    <span
      className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 border ${styles[status] || "text-muted-foreground border-border"}`}
    >
      {labels[status] || status}
    </span>
  );
}
