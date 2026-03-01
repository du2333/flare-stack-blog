import { CheckCircle, Clock, ExternalLink, XCircle } from "lucide-react";
import type { SubmitFriendLinkPageProps } from "@/features/theme/contract/pages";

export function SubmitFriendLinkPage({
  myLinks,
  form,
}: SubmitFriendLinkPageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="cuckoo-card p-6 md:p-8 cuckoo-fade-in">
        <h1 className="text-2xl font-bold cuckoo-text-primary mb-2">
          申请友链
        </h1>
        <p className="cuckoo-text-secondary text-sm">
          填写以下信息提交友链申请
        </p>
      </div>

      {/* My Links */}
      {myLinks.length > 0 && (
        <div className="cuckoo-card p-6 cuckoo-slide-up">
          <h2 className="text-lg font-bold cuckoo-text-primary mb-4">
            我的友链
          </h2>
          <div className="space-y-3">
            {myLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-4 rounded-lg border border-[var(--cuckoo-border)]"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium cuckoo-text-primary">
                      {link.siteName}
                    </h3>
                    <a
                      href={link.siteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cuckoo-text-muted hover:cuckoo-primary"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  <p className="text-xs cuckoo-text-muted">
                    提交于 {new Date(link.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {link.status === "approved" && (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle size={14} />
                      已通过
                    </span>
                  )}
                  {link.status === "pending" && (
                    <span className="flex items-center gap-1 text-amber-600 text-sm">
                      <Clock size={14} />
                      审核中
                    </span>
                  )}
                  {link.status === "rejected" && (
                    <span className="flex items-center gap-1 text-red-600 text-sm">
                      <XCircle size={14} />
                      已拒绝
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Form */}
      <div className="cuckoo-card p-6 cuckoo-slide-up">
        <h2 className="text-lg font-bold cuckoo-text-primary mb-4">
          提交新友链
        </h2>
        <form onSubmit={form.handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
              网站名称
            </label>
            <input
              type="text"
              {...form.register("siteName")}
              placeholder="请输入网站名称"
              className="cuckoo-input"
            />
            {form.errors.siteName && (
              <p className="text-red-500 text-xs mt-1">
                {form.errors.siteName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
              网站地址
            </label>
            <input
              type="url"
              {...form.register("siteUrl")}
              placeholder="https://example.com"
              className="cuckoo-input"
            />
            {form.errors.siteUrl && (
              <p className="text-red-500 text-xs mt-1">
                {form.errors.siteUrl.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
              网站描述
            </label>
            <textarea
              {...form.register("description")}
              placeholder="请简单介绍一下您的网站"
              className="cuckoo-input min-h-[100px]"
            />
            {form.errors.description && (
              <p className="text-red-500 text-xs mt-1">
                {form.errors.description.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium cuckoo-text-secondary mb-1">
              头像/Logo URL
            </label>
            <input
              type="url"
              {...form.register("logoUrl")}
              placeholder="https://example.com/avatar.jpg"
              className="cuckoo-input"
            />
            {form.errors.logoUrl && (
              <p className="text-red-500 text-xs mt-1">
                {form.errors.logoUrl.message}
              </p>
            )}
          </div>

          {/* Turnstile */}
          <div className="my-4">
            {/* Turnstile component would render here */}
          </div>

          <button
            type="submit"
            disabled={form.isSubmitting}
            className="w-full cuckoo-btn cuckoo-btn-primary py-3"
          >
            {form.isSubmitting ? "提交中..." : "提交申请"}
          </button>
        </form>
      </div>
    </div>
  );
}
