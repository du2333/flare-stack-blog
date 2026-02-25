import { useCallback, useState } from "react";
import { useFormContext } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  Guitar,
  Loader2,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { SystemConfig } from "@/features/config/config.schema";
import { Button } from "@/components/ui/button";
import { getSiteUrlsFn, submitUrlsToSearchEnginesFn } from "@/features/config/config.api";

type UrlSubmitStatus = "idle" | "submitted" | "error";

interface SiteUrl {
  url: string;
  type: string;
  title: string;
  updatedAt: Date | null;
  selected: boolean;
  submitStatus: UrlSubmitStatus;
}

/**
 * 站长工具 SEO 配置区域
 * 支持 Google / Bing / 百度站长验证 + 自动 Sitemap URL 提交
 */
export function SeoSection() {
  const { register, setValue } = useFormContext<SystemConfig>();

  // URL 列表与提交状态
  const [siteUrls, setSiteUrls] = useState<SiteUrl[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitResults, setLastSubmitResults] = useState<{
    google?: { success: boolean; message: string };
    bing?: { success: boolean; message: string };
    baidu?: { success: boolean; message: string };
  } | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // 查询网站 URL 列表
  const { isLoading: isLoadingUrls, refetch } = useQuery({
    queryKey: ["admin", "site-urls"],
    queryFn: async () => {
      const urls = await getSiteUrlsFn();
      setSiteUrls(
        urls.map((u) => ({
          ...u,
          selected: true,
          submitStatus: "idle" as UrlSubmitStatus,
        })),
      );
      return urls;
    },
    enabled: false, // 手动触发
  });

  const handleLoadUrls = useCallback(() => {
    refetch();
  }, [refetch]);

  const toggleSelectAll = useCallback(
    (selected: boolean) => {
      setSiteUrls((prev) => prev.map((u) => ({ ...u, selected })));
    },
    [],
  );

  const toggleUrl = useCallback((url: string) => {
    setSiteUrls((prev) =>
      prev.map((u) => (u.url === url ? { ...u, selected: !u.selected } : u)),
    );
  }, []);

  const handleSubmit = async () => {
    const selectedUrls = siteUrls.filter((u) => u.selected).map((u) => u.url);
    if (selectedUrls.length === 0) {
      toast.error("请选择至少一个 URL");
      return;
    }

    setIsSubmitting(true);
    setLastSubmitResults(null);
    try {
      const result = await submitUrlsToSearchEnginesFn({ data: { urls: selectedUrls } });
      setLastSubmitResults(result);

      // 更新提交状态
      const anySuccess = [result.google, result.bing, result.baidu].some(
        (r) => r?.success,
      );
      setSiteUrls((prev) =>
        prev.map((u) =>
          u.selected
            ? { ...u, submitStatus: anySuccess ? "submitted" : "error" }
            : u,
        ),
      );

      const successCount = [result.google, result.bing, result.baidu].filter(
        (r) => r?.success,
      ).length;
      if (successCount > 0) {
        toast.success(`已成功提交 ${selectedUrls.length} 个 URL 至 ${successCount} 个搜索引擎`);
      } else {
        toast.error("提交失败，请检查 API 配置");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "提交失败");
      setSiteUrls((prev) =>
        prev.map((u) => (u.selected ? { ...u, submitStatus: "error" } : u)),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 按类型分组
  const groupedUrls = siteUrls.reduce<Record<string, SiteUrl[]>>((acc, u) => {
    const key = u.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(u);
    return acc;
  }, {});

  const typeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    page: { label: "页面", icon: <Globe size={12} /> },
    post: { label: "文章", icon: <FileText size={12} /> },
    "guitar-tab": { label: "吉他谱", icon: <Guitar size={12} /> },
  };

  const selectedCount = siteUrls.filter((u) => u.selected).length;
  const submittedCount = siteUrls.filter((u) => u.submitStatus === "submitted").length;

  return (
    <div className="space-y-12">
      {/* ── 站长验证码 ── */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-serif font-medium tracking-tight">站长验证</h3>
          <p className="text-xs text-muted-foreground/60">
            直接粘贴搜索引擎提供的完整 &lt;meta&gt; 标签，系统会自动提取 content 值
          </p>
        </div>

        <div className="grid gap-5">
          <VerificationField
            label="Google Search Console"
            example='<meta name="google-site-verification" content="xxxxxxxx" />'
            registerPath="seo.googleVerification"
            register={register}
            setValue={setValue}
          />
          <VerificationField
            label="Bing Webmaster Tools"
            example='<meta name="msvalidate.01" content="xxxxxxxx" />'
            registerPath="seo.bingVerification"
            register={register}
            setValue={setValue}
          />
          <VerificationField
            label="百度站长平台"
            example='<meta name="baidu-site-verification" content="xxxxxxxx" />'
            registerPath="seo.baiduVerification"
            register={register}
            setValue={setValue}
          />
        </div>
      </section>

      {/* ── API Key 配置 ── */}
      <section className="space-y-6 pt-8 border-t border-border/20">
        <div className="space-y-1">
          <h3 className="text-lg font-serif font-medium tracking-tight">API 密钥</h3>
          <p className="text-xs text-muted-foreground/60">
            配置搜索引擎 API Key 以启用 URL 提交功能
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <ApiKeyField
            label="Bing API Key"
            hint="Bing Webmaster → 设置 → API Access"
            registerPath="seo.bingApiKey"
            register={register}
          />
          <ApiKeyField
            label="百度推送 Token"
            hint="百度站长平台 → 普通收录 → API 提交"
            registerPath="seo.baiduPushToken"
            register={register}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Google Indexing API Key（Base64）
          </label>
          <textarea
            {...register("seo.googleIndexingKey")}
            placeholder="Service Account JSON Key → base64 编码后粘贴"
            className="w-full h-20 px-3 py-2 rounded-lg border border-border/40 bg-muted/10 text-xs resize-none placeholder:text-muted-foreground/30 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all font-mono"
          />
          <p className="text-[10px] text-muted-foreground/40 mt-1">
            Google Cloud → IAM → Service Accounts → 创建 JSON Key → base64 编码
          </p>
        </div>
      </section>

      {/* ── URL 批量提交 ── */}
      <section className="space-y-6 pt-8 border-t border-border/20">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-serif font-medium tracking-tight">URL 提交</h3>
            <p className="text-xs text-muted-foreground/60">
              自动加载网站所有页面，选择后一键提交到搜索引擎
            </p>
          </div>
          <Button
            type="button"
            onClick={handleLoadUrls}
            disabled={isLoadingUrls}
            variant="outline"
            size="sm"
            className="rounded-none font-mono text-[10px] uppercase tracking-widest h-8 px-3"
          >
            {isLoadingUrls ? (
              <Loader2 size={12} className="animate-spin mr-1.5" />
            ) : (
              <RefreshCw size={12} className="mr-1.5" />
            )}
            加载站点 URL
          </Button>
        </div>

        {siteUrls.length > 0 && (
          <div className="space-y-4">
            {/* 统计栏 */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground/60 font-mono">
              <span>共 {siteUrls.length} 个 URL</span>
              <span>已选 {selectedCount} 个</span>
              {submittedCount > 0 && (
                <span className="text-green-600">已提交 {submittedCount} 个</span>
              )}
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => toggleSelectAll(true)}
                className="text-accent hover:underline cursor-pointer"
              >
                全选
              </button>
              <button
                type="button"
                onClick={() => toggleSelectAll(false)}
                className="text-accent hover:underline cursor-pointer"
              >
                取消全选
              </button>
            </div>

            {/* URL 分组列表 */}
            <div className="space-y-2">
              {Object.entries(groupedUrls).map(([type, urls]) => {
                const info = typeLabels[type] ?? { label: type, icon: <Globe size={12} /> };
                const isExpanded = expandedSection === type;
                const groupSelected = urls.filter((u) => u.selected).length;

                return (
                  <div key={type} className="border border-border/30 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedSection(isExpanded ? null : type)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors cursor-pointer"
                    >
                      <span className="text-muted-foreground/50">{info.icon}</span>
                      <span className="text-xs font-medium">{info.label}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/40">
                        {groupSelected}/{urls.length}
                      </span>
                      <div className="flex-1" />
                      {isExpanded ? (
                        <ChevronUp size={14} className="text-muted-foreground/40" />
                      ) : (
                        <ChevronDown size={14} className="text-muted-foreground/40" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border/20 max-h-[300px] overflow-y-auto">
                        {urls.map((u) => (
                          <label
                            key={u.url}
                            className="flex items-center gap-3 px-4 py-2 hover:bg-muted/5 transition-colors cursor-pointer border-b border-border/10 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={u.selected}
                              onChange={() => toggleUrl(u.url)}
                              className="rounded border-border/40 text-accent focus:ring-accent/20"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs truncate">{u.title}</p>
                              <p className="text-[10px] font-mono text-muted-foreground/40 truncate">
                                {u.url}
                              </p>
                            </div>
                            {u.submitStatus === "submitted" && (
                              <CheckCircle size={12} className="text-green-600 shrink-0" />
                            )}
                            {u.submitStatus === "error" && (
                              <XCircle size={12} className="text-red-500 shrink-0" />
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 提交按钮 + 结果 */}
            <div className="flex items-center gap-4 pt-2">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || selectedCount === 0}
                className="rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-[10px] uppercase tracking-widest h-9 px-5"
              >
                {isSubmitting ? (
                  <Loader2 size={12} className="animate-spin mr-2" />
                ) : (
                  <Send size={12} className="mr-2" />
                )}
                提交 {selectedCount} 个 URL
              </Button>
            </div>

            {/* 提交结果 */}
            {lastSubmitResults && (
              <div className="grid sm:grid-cols-3 gap-3 pt-2">
                {lastSubmitResults.google && (
                  <ResultCard
                    label="Google"
                    success={lastSubmitResults.google.success}
                    message={lastSubmitResults.google.message}
                  />
                )}
                {lastSubmitResults.bing && (
                  <ResultCard
                    label="Bing"
                    success={lastSubmitResults.bing.success}
                    message={lastSubmitResults.bing.message}
                  />
                )}
                {lastSubmitResults.baidu && (
                  <ResultCard
                    label="百度"
                    success={lastSubmitResults.baidu.success}
                    message={lastSubmitResults.baidu.message}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * 从完整 meta 标签中提取 content 值
 * 支持: <meta name="xxx" content="VALUE" /> 或直接输入 VALUE
 */
function extractMetaContent(input: string): string {
  const trimmed = input.trim();
  // 尝试匹配 <meta ... content="..." ...>
  const match = trimmed.match(/content\s*=\s*["']([^"']*)["']/i);
  if (match) return match[1];
  // 如果不是 meta 标签格式，原样返回（用户可能直接输入了 content 值）
  return trimmed;
}

function VerificationField({
  label,
  example,
  registerPath,
  register,
  setValue,
}: {
  label: string;
  example: string;
  registerPath: `seo.${string}`;
  register: ReturnType<typeof useFormContext<SystemConfig>>["register"];
  setValue: ReturnType<typeof useFormContext<SystemConfig>>["setValue"];
}) {
  const fieldPath = registerPath as any;
  const registration = register(fieldPath);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted.includes("<meta")) {
      e.preventDefault();
      const content = extractMetaContent(pasted);
      setValue(fieldPath, content, { shouldDirty: true });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes("<meta")) {
      const content = extractMetaContent(val);
      setValue(fieldPath, content, { shouldDirty: true });
    } else {
      registration.onChange(e);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        {...registration}
        onChange={handleChange}
        onPaste={handlePaste}
        type="text"
        placeholder={example}
        className="w-full h-9 px-3 rounded-lg border border-border/40 bg-muted/10 text-xs placeholder:text-muted-foreground/30 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all font-mono"
      />
      <p className="text-[10px] text-muted-foreground/40">
        可直接粘贴完整 &lt;meta&gt; 标签，系统自动提取 content 值
      </p>
    </div>
  );
}

function ApiKeyField({
  label,
  hint,
  registerPath,
  register,
}: {
  label: string;
  hint: string;
  registerPath: `seo.${string}`;
  register: ReturnType<typeof useFormContext<SystemConfig>>["register"];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        {...register(registerPath as keyof SystemConfig extends never ? never : any)}
        type="password"
        placeholder="••••••••"
        className="w-full h-9 px-3 rounded-lg border border-border/40 bg-muted/10 text-xs placeholder:text-muted-foreground/30 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all font-mono"
      />
      <p className="text-[10px] text-muted-foreground/40">{hint}</p>
    </div>
  );
}

function ResultCard({
  label,
  success,
  message,
}: {
  label: string;
  success: boolean;
  message: string;
}) {
  return (
    <div
      className={`flex items-start gap-2 p-3 rounded-lg border ${
        success
          ? "border-green-600/20 bg-green-600/5"
          : "border-red-500/20 bg-red-500/5"
      }`}
    >
      {success ? (
        <CheckCircle size={14} className="text-green-600 shrink-0 mt-0.5" />
      ) : (
        <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5 break-all">
          {message}
        </p>
      </div>
    </div>
  );
}
