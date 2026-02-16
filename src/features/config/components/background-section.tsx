import { Image, Layers, Sparkles } from "lucide-react";
import { useFormContext } from "react-hook-form";
import type { SystemConfig } from "@/features/config/config.schema";
import { DEFAULT_BACKGROUND_CONFIG } from "@/features/config/config.schema";
import { Input } from "@/components/ui/input";

export function BackgroundSection() {
  const { register, watch, setValue } = useFormContext<SystemConfig>();

  const enabled =
    watch("background.enabled") ?? DEFAULT_BACKGROUND_CONFIG.enabled;
  const imageUrl =
    watch("background.imageUrl") ?? DEFAULT_BACKGROUND_CONFIG.imageUrl;
  const homeImageUrl =
    watch("background.homeImageUrl") ??
    DEFAULT_BACKGROUND_CONFIG.homeImageUrl;
  const opacity =
    watch("background.opacity") ?? DEFAULT_BACKGROUND_CONFIG.opacity!;
  const darkOpacity =
    watch("background.darkOpacity") ?? DEFAULT_BACKGROUND_CONFIG.darkOpacity!;
  const blur = watch("background.blur") ?? DEFAULT_BACKGROUND_CONFIG.blur!;
  const overlayOpacity =
    watch("background.overlayOpacity") ??
    DEFAULT_BACKGROUND_CONFIG.overlayOpacity!;

  return (
    <div className="space-y-16">
      {/* Enable/Disable */}
      <section className="space-y-6">
        <header className="flex items-center gap-3">
          <Sparkles size={12} className="text-muted-foreground" />
          <h5 className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            背景开关
          </h5>
        </header>

        <div className="pl-6 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-serif text-foreground">
              启用自定义背景
            </span>
            <p className="text-[10px] font-mono text-muted-foreground/50">
              开启后将在博客页面显示背景图片
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() =>
              setValue("background.enabled", !enabled, { shouldDirty: true })
            }
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
              enabled ? "bg-foreground" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-background transition-transform duration-200 ${
                enabled ? "translate-x-[18px]" : "translate-x-[3px]"
              }`}
            />
          </button>
        </div>
      </section>

      {/* Global Image URL */}
      <section className="space-y-6 pt-6 border-t border-border/30">
        <header className="flex items-center gap-3">
          <Image size={12} className="text-muted-foreground" />
          <h5 className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            全局背景图片
          </h5>
        </header>

        <div className="pl-6 space-y-4">
          <div className="space-y-3 group max-w-2xl">
            <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground group-focus-within:text-foreground transition-colors">
              图片链接
            </label>
            <Input
              {...register("background.imageUrl")}
              placeholder="/images/your-key.webp 或 https://example.com/bg.webp"
              className="w-full bg-transparent border-b border-border/50 rounded-none py-2 text-sm font-mono focus-visible:ring-0 focus:border-foreground transition-all px-0"
            />
            <p className="text-[10px] font-mono text-muted-foreground/50">
              所有页面的默认背景，支持 R2 路径 (/images/xxx) 或外部 URL
            </p>
          </div>

          {/* Preview */}
          {imageUrl && (
            <div className="max-w-xs">
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                预览
              </p>
              <div className="relative aspect-video overflow-hidden border border-border/30 bg-muted/10">
                <img
                  src={imageUrl}
                  alt="全局背景预览"
                  className="w-full h-full object-cover"
                  style={{ opacity: opacity / 100 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, hsl(var(--background) / ${(overlayOpacity * 0.9) / 100}), hsl(var(--background) / ${(overlayOpacity * 0.5) / 100}), hsl(var(--background) / ${(overlayOpacity * 0.9) / 100}))`,
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: `hsl(var(--background) / ${overlayOpacity / 100})`,
                    backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Home Image URL */}
      <section className="space-y-6 pt-6 border-t border-border/30">
        <header className="flex items-center gap-3">
          <Image size={12} className="text-muted-foreground" />
          <h5 className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            主页背景图片
          </h5>
        </header>

        <div className="pl-6 space-y-4">
          <div className="space-y-3 group max-w-2xl">
            <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground group-focus-within:text-foreground transition-colors">
              图片链接
            </label>
            <Input
              {...register("background.homeImageUrl")}
              placeholder="/images/home-bg.webp 或 https://example.com/home-bg.webp"
              className="w-full bg-transparent border-b border-border/50 rounded-none py-2 text-sm font-mono focus-visible:ring-0 focus:border-foreground transition-all px-0"
            />
            <p className="text-[10px] font-mono text-muted-foreground/50">
              仅在主页显示，向下滚动时渐变过渡到全局背景
            </p>
          </div>

          {/* Preview */}
          {homeImageUrl && (
            <div className="max-w-xs">
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                预览
              </p>
              <div className="relative aspect-video overflow-hidden border border-border/30 bg-muted/10">
                <img
                  src={homeImageUrl}
                  alt="主页背景预览"
                  className="w-full h-full object-cover"
                  style={{ opacity: opacity / 100 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, hsl(var(--background) / ${(overlayOpacity * 0.9) / 100}), hsl(var(--background) / ${(overlayOpacity * 0.5) / 100}), hsl(var(--background) / ${(overlayOpacity * 0.9) / 100}))`,
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: `hsl(var(--background) / ${overlayOpacity / 100})`,
                    backdropFilter: blur > 0 ? `blur(${blur}px)` : undefined,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Opacity & Blur Controls */}
      <section className="space-y-6 pt-6 border-t border-border/30">
        <header className="flex items-center gap-3">
          <Layers size={12} className="text-muted-foreground" />
          <h5 className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
            效果参数
          </h5>
        </header>

        <div className="pl-6 space-y-10">
          {/* Light Mode Opacity */}
          <div className="space-y-3 max-w-md">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                亮色模式透明度
              </label>
              <span className="text-xs font-mono text-foreground tabular-nums">
                {opacity}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={opacity}
              onChange={(e) =>
                setValue("background.opacity", Number(e.target.value), {
                  shouldDirty: true,
                })
              }
              className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-foreground"
            />
          </div>

          {/* Dark Mode Opacity */}
          <div className="space-y-3 max-w-md">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                暗色模式透明度
              </label>
              <span className="text-xs font-mono text-foreground tabular-nums">
                {darkOpacity}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={darkOpacity}
              onChange={(e) =>
                setValue("background.darkOpacity", Number(e.target.value), {
                  shouldDirty: true,
                })
              }
              className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-foreground"
            />
          </div>

          {/* Blur */}
          <div className="space-y-3 max-w-md">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                模糊程度
              </label>
              <span className="text-xs font-mono text-foreground tabular-nums">
                {blur}px
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={20}
              value={blur}
              onChange={(e) =>
                setValue("background.blur", Number(e.target.value), {
                  shouldDirty: true,
                })
              }
              className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-foreground"
            />
          </div>

          {/* Overlay Opacity */}
          <div className="space-y-3 max-w-md">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                遮罩不透明度
              </label>
              <span className="text-xs font-mono text-foreground tabular-nums">
                {overlayOpacity}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={overlayOpacity}
              onChange={(e) =>
                setValue("background.overlayOpacity", Number(e.target.value), {
                  shouldDirty: true,
                })
              }
              className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-foreground"
            />
            <p className="text-[10px] font-mono text-muted-foreground/50">
              值越低背景越清晰，值越高文字越易读
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
