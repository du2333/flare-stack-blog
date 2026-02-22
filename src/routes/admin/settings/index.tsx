import { createFileRoute } from "@tanstack/react-router";
import { Check, Hammer, Loader2, Server } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  DEFAULT_CONFIG,
  SystemConfigSchema,
} from "@/features/config/config.schema";
import { EmailServiceSection } from "@/features/email/components/email-service-section";
import { MaintenanceSection } from "@/features/config/components/maintenance-section";
import { useSystemSetting } from "@/features/config/hooks/use-system-setting";
import { useEmailConnection } from "@/features/email/hooks/use-email-connection";
import { SectionSkeleton } from "@/features/config/components/settings-skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/admin/settings/")({
  component: RouteComponent,
  loader: () => ({
    title: "设置",
  }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title,
      },
    ],
  }),
});

function RouteComponent() {
  const { settings, saveSettings, isLoading } = useSystemSetting();
  const { testEmailConnection } = useEmailConnection();

  const methods = useForm<SystemConfig>({
    resolver: zodResolver(SystemConfigSchema),
    defaultValues: DEFAULT_CONFIG,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = methods;

  // 同步 settings 到 form
  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const onSubmit = async (data: SystemConfig) => {
    try {
      await saveSettings({ data });
      toast.success("系统配置已生效");
      // Reset dirty state with new values
      reset(data);
    } catch {
      toast.error("保存失败，请重试");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 pb-20">
        <SectionSkeleton />
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000"
      >
        {/* Header Area */}
        <div className="flex justify-between items-end pb-8 border-b border-border/30">
          <div className="space-y-1">
            <h1 className="text-3xl font-serif font-medium tracking-tight text-foreground">
              系统设置
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                SYSTEM_CONFIGURATION
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="h-11 px-8 rounded-none bg-foreground text-background hover:bg-foreground/90 transition-all font-mono text-[11px] uppercase tracking-[0.2em] font-medium disabled:opacity-50 shadow-lg shadow-foreground/5"
          >
            {isSubmitting ? (
              <Loader2 size={14} className="animate-spin mr-3" />
            ) : (
              <Check size={14} className="mr-3" />
            )}
            {isSubmitting ? "正在同步" : "应用更改"}
          </Button>
        </div>

        {/* Main Content with Tabs */}
        <Tabs
          defaultValue="service"
          className="flex flex-col md:grid md:grid-cols-[220px_1fr] gap-10 lg:gap-16 items-start"
        >
          <TabsList className="flex flex-row md:flex-col h-auto bg-transparent p-0 gap-1.5 md:w-full overflow-x-auto md:overflow-visible justify-start border-b md:border-b-0 md:border-r border-border/20 pb-4 md:pb-0 md:pr-6">
            <TabsTrigger
              value="service"
              className="w-full md:justify-start justify-center flex items-center px-4 py-3 rounded-none text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground data-[state=active]:bg-muted/30 data-[state=active]:text-foreground data-[state=active]:font-bold transition-all duration-300 border-l-2 border-transparent data-[state=active]:border-foreground shadow-none group"
            >
              <Server
                size={14}
                className="mr-3 shrink-0 opacity-40 group-data-[state=active]:opacity-100 group-data-[state=active]:text-foreground transition-opacity"
              />
              服务配置
            </TabsTrigger>
            <TabsTrigger
              value="maintenance"
              className="w-full md:justify-start justify-center flex items-center px-4 py-3 rounded-none text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground data-[state=active]:bg-muted/30 data-[state=active]:text-foreground data-[state=active]:font-bold transition-all duration-300 border-l-2 border-transparent data-[state=active]:border-foreground shadow-none group"
            >
              <Hammer
                size={14}
                className="mr-3 shrink-0 opacity-40 group-data-[state=active]:opacity-100 group-data-[state=active]:text-foreground transition-opacity"
              />
              系统维护
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-w-0 space-y-12">
            <TabsContent
              value="service"
              className="mt-0 space-y-10 animate-in fade-in slide-in-from-right-2 duration-500"
            >
              <div className="space-y-2 pb-6 border-b border-border/30">
                <h2 className="text-2xl font-serif font-medium tracking-tight">
                  服务连接
                </h2>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    EXTERNAL_INTEGRATIONS
                  </p>
                </div>
              </div>
              <EmailServiceSection testEmailConnection={testEmailConnection} />
            </TabsContent>

            <TabsContent
              value="maintenance"
              className="mt-0 space-y-10 animate-in fade-in slide-in-from-right-2 duration-500"
            >
              <div className="space-y-2 pb-6 border-b border-border/30">
                <h2 className="text-2xl font-serif font-medium tracking-tight">
                  数据维护
                </h2>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    SYSTEM_AND_DATA_HEALTH
                  </p>
                </div>
              </div>
              <MaintenanceSection />
            </TabsContent>
          </div>
        </Tabs>
      </form>
    </FormProvider>
  );
}
