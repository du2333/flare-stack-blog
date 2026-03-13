import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  Hammer,
  LayoutTemplate,
  Loader2,
  Mail,
  Webhook,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaintenanceSection } from "@/features/config/components/maintenance-section";
import { SectionSkeleton } from "@/features/config/components/settings-skeleton";
import { SiteSettingsSection } from "@/features/config/components/site-settings-section";
import type { SystemConfig } from "@/features/config/config.schema";
import {
  createSystemConfigFormSchema,
  DEFAULT_CONFIG,
} from "@/features/config/config.schema";
import { useSystemSetting } from "@/features/config/hooks/use-system-setting";
import { EmailServiceSection } from "@/features/email/components/email-service-section";
import { useEmailConnection } from "@/features/email/hooks/use-email-connection";
import { WebhookSettingsSection } from "@/features/webhook/components/webhook-settings-section";
import { cn } from "@/lib/utils";
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
  const [activeTab, setActiveTab] = useState("site");
  const formRef = useRef<HTMLFormElement>(null);
  const hasMountedRef = useRef(false);
  const tabItems = [
    {
      value: "site",
      icon: LayoutTemplate,
      label: m.settings_tab_site(),
    },
    {
      value: "email",
      icon: Mail,
      label: m.settings_tab_email(),
    },
    {
      value: "webhook",
      icon: Webhook,
      label: m.settings_tab_webhook(),
    },
    {
      value: "maintenance",
      icon: Hammer,
      label: m.settings_tab_maintenance(),
    },
  ] as const;

  const methods = useForm<SystemConfig>({
    resolver: zodResolver(createSystemConfigFormSchema(m)),
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

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const frame = requestAnimationFrame(() => {
      const scrollContainer = formRef.current?.closest(".custom-scrollbar");
      if (!(scrollContainer instanceof HTMLElement)) return;

      scrollContainer.scrollTo({
        top: 0,
        left: 0,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [activeTab]);

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
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000 lg:space-y-12"
      >
        {/* Header Area */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pb-5 border-b border-border/30 lg:pb-8">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight text-foreground">
              {m.settings_header_title()}
            </h1>
            <p className="text-sm text-muted-foreground">
              {m.settings_header_desc()}
            </p>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="hidden sm:flex h-11 px-8 rounded-none bg-foreground text-background hover:bg-foreground/90 transition-all font-mono text-[11px] uppercase tracking-[0.2em] font-medium disabled:opacity-50 shadow-lg shadow-foreground/5"
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
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col lg:grid lg:grid-cols-[220px_1fr] gap-8 lg:gap-16 items-start"
        >
          <div className="sticky top-0 z-40 w-full self-start border-b border-border/20 bg-background/96 pt-0.5 pb-2 backdrop-blur-md shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)] lg:border-b-0 lg:bg-transparent lg:pt-0 lg:pb-0 lg:backdrop-blur-none lg:shadow-none">
            <div className="overflow-x-auto no-scrollbar">
              <TabsList className="mx-auto flex w-max min-w-full flex-row justify-center rounded-2xl border border-border/25 bg-background/90 p-1.5 gap-1.5 transition-all duration-300 lg:w-full lg:min-w-0 lg:flex-col lg:justify-start lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:gap-1.5 lg:border-r lg:border-border/20 lg:pr-6">
                {tabItems.map(({ value, icon: Icon, label }) => {
                  const isActive = activeTab === value;

                  return (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className={cn(
                        "flex items-center justify-center px-3 py-2.5 rounded-full text-[10px] font-mono uppercase tracking-[0.15em] transition-all duration-300 border-none shadow-none group shrink-0 whitespace-nowrap lg:w-full lg:justify-start lg:px-4 lg:py-3 lg:rounded-none lg:border-l-2 lg:border-transparent",
                        "text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background lg:data-[state=active]:bg-muted/30 lg:data-[state=active]:text-foreground lg:data-[state=active]:border-foreground",
                        isActive ? "pl-3 pr-4" : "px-3",
                      )}
                    >
                      <Icon
                        size={14}
                        className={cn(
                          "shrink-0 transition-all duration-300",
                          isActive ? "opacity-100" : "opacity-60",
                        )}
                      />
                      <span
                        className={cn(
                          "overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-out",
                          isActive
                            ? "ml-2 max-w-32 opacity-100"
                            : "ml-0 max-w-0 opacity-0",
                          "lg:ml-3 lg:max-w-none lg:opacity-100",
                        )}
                      >
                        {label}
                      </span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-12 pt-2 lg:pt-0">
            <TabsContent value="site" className="mt-0 space-y-10">
              <div className="space-y-2 pb-6 border-b border-border/30">
                <h2 className="text-2xl font-serif font-medium tracking-tight">
                  {m.settings_site_title()}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {m.settings_site_desc()}
                </p>
              </div>
              <SiteSettingsSection />
            </TabsContent>

            <TabsContent value="email" className="mt-0 space-y-10">
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

            <TabsContent value="webhook" className="mt-0 space-y-10">
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

            <TabsContent value="maintenance" className="mt-0 space-y-10">
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

        {/* Floating Action Button for Mobile */}
        {isDirty && (
          <div className="fixed bottom-8 right-6 z-50 sm:hidden animate-in fade-in zoom-in slide-in-from-bottom-10 duration-500">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-14 w-14 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-all shadow-2xl flex items-center justify-center p-0"
            >
              {isSubmitting ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <Check size={24} />
              )}
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  );
}
