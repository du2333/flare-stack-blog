import { ClientOnly } from "@tanstack/react-router";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import type { ComponentProps } from "react";
import type { CreateFriendLinkInput } from "@/features/friend-links/friend-links.schema";
import { CreateFriendLinkInputSchema } from "@/features/friend-links/friend-links.schema";
import { useAdminFriendLinks } from "@/features/friend-links/hooks/use-friend-links";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddFriendLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddFriendLinkModalInternal = ({
  isOpen,
  onClose,
}: AddFriendLinkModalProps) => {
  const { create, isCreating } = useAdminFriendLinks();
  const form = useForm<CreateFriendLinkInput>({
    resolver: standardSchemaResolver(CreateFriendLinkInputSchema),
    defaultValues: {
      siteName: "",
      siteUrl: "",
      description: "",
      logoUrl: "",
      contactEmail: "",
    },
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = form;

  const [siteName, siteUrl] = watch(["siteName", "siteUrl"]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = (data: CreateFriendLinkInput) => {
    create(
      {
        data: {
          siteName: data.siteName,
          siteUrl: data.siteUrl,
          description: data.description || undefined,
          logoUrl: data.logoUrl || undefined,
          contactEmail: data.contactEmail || undefined,
        },
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />
      <div className="relative bg-background border border-border/30 p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200 shadow-lg">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
        <h3 className="text-xl font-serif font-medium mb-6">添加友链</h3>
        <p className="text-sm text-muted-foreground mb-6">
          手动添加的友链将直接设为已通过状态。
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <ModalFormField
            label="站点名称 *"
            placeholder="例：我的博客"
            error={errors.siteName?.message}
            inputProps={register("siteName")}
          />
          <ModalFormField
            label="站点地址 *"
            placeholder="https://..."
            error={errors.siteUrl?.message}
            inputProps={register("siteUrl")}
          />
          <ModalFormField
            label="站点简介"
            placeholder="简要介绍该站点"
            error={errors.description?.message}
            inputProps={register("description")}
          />
          <ModalFormField
            label="Logo 地址"
            placeholder="https://..."
            error={errors.logoUrl?.message}
            inputProps={register("logoUrl")}
          />
          <ModalFormField
            label="联系邮箱"
            placeholder="可选"
            error={errors.contactEmail?.message}
            inputProps={register("contactEmail")}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="font-mono text-xs uppercase tracking-widest rounded-none"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isCreating || !siteName.trim() || !siteUrl.trim()}
              className="rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-xs uppercase tracking-widest"
            >
              {isCreating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                "添加"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export function AddFriendLinkModal(props: AddFriendLinkModalProps) {
  return (
    <ClientOnly>
      <AddFriendLinkModalInternal {...props} />
    </ClientOnly>
  );
}

function ModalFormField({
  label,
  placeholder,
  error,
  inputProps,
}: {
  label: string;
  placeholder?: string;
  error?: string;
  inputProps: ComponentProps<typeof Input>;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <Input
        {...inputProps}
        placeholder={placeholder}
        className="bg-transparent border-0 border-b border-border/50 text-base px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all shadow-none h-auto py-1.5 placeholder:text-muted-foreground/30"
      />
      {error && <p className="text-xs text-red-500">! {error}</p>}
    </div>
  );
}
