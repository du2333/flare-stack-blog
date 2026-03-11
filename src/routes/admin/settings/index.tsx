import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Hammer, Loader2, Mail, Webhook } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaintenanceSection } from "@/features/config/components/maintenance-section";
import { SectionSkeleton } from "@/features/config/components/settings-skeleton";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  DEFAULT_CONFIG,
  SystemConfigSchema,
} from "@/features/config/config.schema";
import { useSystemSetting } from "@/features/config/hooks/use-system-setting";
import { EmailServiceSection } from "@/features/email/components/email-service-section";
import { useEmailConnection } from "@/features/email/hooks/use-email-connection";
import { WebhookSettingsSection } from "@/features/webhook/components/webhook-settings-section";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/admin/settings/")({
  ssr: false,
  component: RouteComponent,
  loader: () => ({
    title: m.settings_admin_title(),
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
      toast.success(m.settings_toast_save_success());
      // Reset dirty state with new values
      reset(data);
    } catch {
      toast.error(m.settings_toast_save_error());
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
              {m.settings_header_title()}
            </h1>
            <p className="text-sm text-muted-foreground">
              {m.settings_header_desc()}
            </p>
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
            {isSubmitting ? m.settings_btn_saving() : m.settings_btn_save()}
          </Button>
        </div>

        {/* Main Content with Tabs */}
        <Tabs
          defaultValue="email"
          className="flex flex-col lg:grid lg:grid-cols-[220px_1fr] gap-10 lg:gap-16 items-start"
        >
          <TabsList className="flex flex-row lg:flex-col h-auto bg-transparent p-0 gap-1.5 lg:w-full overflow-x-auto lg:overflow-visible justify-start border-b lg:border-b-0 lg:border-r border-border/20 pb-4 lg:pb-0 lg:pr-6">
            <TabsTrigger
              value="email"
              className="w-full lg:justify-start justify-center flex items-center px-4 py-3 rounded-none text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground data-[state=active]:bg-muted/30 data-[state=active]:text-foreground data-[state=active]:font-bold transition-all duration-300 border-b-2 lg:border-b-0 lg:border-l-2 border-transparent data-[state=active]:border-foreground shadow-none group"
            >
              <Mail
                size={14}
                className="mr-3 shrink-0 opacity-40 group-data-[state=active]:opacity-100 group-data-[state=active]:text-foreground transition-opacity"
              />
              {m.settings_tab_email()}
            </TabsTrigger>
            <TabsTrigger
              value="webhook"
              className="w-full lg:justify-start justify-center flex items-center px-4 py-3 rounded-none text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground data-[state=active]:bg-muted/30 data-[state=active]:text-foreground data-[state=active]:font-bold transition-all duration-300 border-b-2 lg:border-b-0 lg:border-l-2 border-transparent data-[state=active]:border-foreground shadow-none group"
            >
              <Webhook
                size={14}
                className="mr-3 shrink-0 opacity-40 group-data-[state=active]:opacity-100 group-data-[state=active]:text-foreground transition-opacity"
              />
              {m.settings_tab_webhook()}
            </TabsTrigger>
            <TabsTrigger
              value="maintenance"
              className="w-full lg:justify-start justify-center flex items-center px-4 py-3 rounded-none text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground data-[state=active]:bg-muted/30 data-[state=active]:text-foreground data-[state=active]:font-bold transition-all duration-300 border-b-2 lg:border-b-0 lg:border-l-2 border-transparent data-[state=active]:border-foreground shadow-none group"
            >
              <Hammer
                size={14}
                className="mr-3 shrink-0 opacity-40 group-data-[state=active]:opacity-100 group-data-[state=active]:text-foreground transition-opacity"
              />
              {m.settings_tab_maintenance()}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-w-0 space-y-12">
            <TabsContent
              value="email"
              className="mt-0 space-y-10 animate-in fade-in slide-in-from-right-2 duration-500"
            >
              <div className="space-y-2 pb-6 border-b border-border/30">
                <h2 className="text-2xl font-serif font-medium tracking-tight">
                  {m.settings_email_title()}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {m.settings_email_desc()}
                </p>
              </div>
              <EmailServiceSection testEmailConnection={testEmailConnection} />
            </TabsContent>

            <TabsContent
              value="webhook"
              className="mt-0 space-y-10 animate-in fade-in slide-in-from-right-2 duration-500"
            >
              <div className="space-y-2 pb-6 border-b border-border/30">
                <h2 className="text-2xl font-serif font-medium tracking-tight">
                  {m.settings_webhook_title()}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {m.settings_webhook_desc()}
                </p>
              </div>
              <WebhookSettingsSection />
            </TabsContent>

            <TabsContent
              value="maintenance"
              className="mt-0 space-y-10 animate-in fade-in slide-in-from-right-2 duration-500"
            >
              <div className="space-y-2 pb-6 border-b border-border/30">
                <h2 className="text-2xl font-serif font-medium tracking-tight">
                  {m.settings_maintenance_title()}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {m.settings_maintenance_desc()}
                </p>
              </div>
              <MaintenanceSection />
            </TabsContent>
          </div>
        </Tabs>
      </form>
    </FormProvider>
  );
}
