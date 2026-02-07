import { ClientOnly } from "@tanstack/react-router";
import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
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
  const [formData, setFormData] = useState({
    siteName: "",
    siteUrl: "",
    description: "",
    logoUrl: "",
    contactEmail: "",
  });

  const handleSubmit = async () => {
    if (!formData.siteName || !formData.siteUrl) return;
    await create({
      data: {
        siteName: formData.siteName,
        siteUrl: formData.siteUrl,
        description: formData.description || undefined,
        logoUrl: formData.logoUrl || undefined,
        contactEmail: formData.contactEmail || undefined,
      },
    });
    setFormData({
      siteName: "",
      siteUrl: "",
      description: "",
      logoUrl: "",
      contactEmail: "",
    });
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative bg-background border border-border/30 p-8 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200 shadow-lg">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
        <h3 className="text-lg font-serif font-medium mb-6">添加友链</h3>
        <p className="text-xs text-muted-foreground mb-6">
          手动添加的友链将直接设为已通过状态。
        </p>
        <div className="space-y-4">
          <ModalFormField
            label="站点名称 *"
            value={formData.siteName}
            onChange={(v) => setFormData((p) => ({ ...p, siteName: v }))}
            placeholder="例：我的博客"
          />
          <ModalFormField
            label="站点地址 *"
            value={formData.siteUrl}
            onChange={(v) => setFormData((p) => ({ ...p, siteUrl: v }))}
            placeholder="https://..."
          />
          <ModalFormField
            label="站点简介"
            value={formData.description}
            onChange={(v) => setFormData((p) => ({ ...p, description: v }))}
            placeholder="简要介绍该站点"
          />
          <ModalFormField
            label="Logo 地址"
            value={formData.logoUrl}
            onChange={(v) => setFormData((p) => ({ ...p, logoUrl: v }))}
            placeholder="https://..."
          />
          <ModalFormField
            label="联系邮箱"
            value={formData.contactEmail}
            onChange={(v) => setFormData((p) => ({ ...p, contactEmail: v }))}
            placeholder="可选"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={onClose}
              className="font-mono text-[10px] uppercase tracking-widest rounded-none"
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isCreating || !formData.siteName || !formData.siteUrl}
              className="rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-[10px] uppercase tracking-widest"
            >
              {isCreating ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                "添加"
              )}
            </Button>
          </div>
        </div>
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
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent border-0 border-b border-border/50 text-sm px-0 rounded-none focus-visible:ring-0 focus-visible:border-foreground transition-all shadow-none h-auto py-1.5 placeholder:text-muted-foreground/30"
      />
    </div>
  );
}
