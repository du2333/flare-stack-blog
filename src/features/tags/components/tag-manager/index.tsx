import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpDown, Check, Hash, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  createTagFn,
  deleteTagFn,
  updateTagFn,
} from "@/features/tags/api/tags.api";
import {
  TAGS_KEYS,
  tagsWithCountAdminQueryOptions,
} from "@/features/tags/queries";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TagManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "postCount">(
    "postCount",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [tagToDelete, setTagToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [tagToEdit, setTagToEdit] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery(
    tagsWithCountAdminQueryOptions({ sortBy, sortDir }),
  );

  const filteredTags = useMemo(() => {
    return tags.filter((tag) =>
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [tags, searchTerm]);

  const updateTagMutation = useMutation({
    mutationFn: async (data: { id: number; name: string }) => {
      return await updateTagFn({
        data: { id: data.id, data: { name: data.name } },
      });
    },
    onSuccess: (result) => {
      if (result.error) {
        const reason = result.error.reason;
        switch (reason) {
          case "TAG_NOT_FOUND":
            toast.error("标签不存在");
            return;
          case "TAG_NAME_ALREADY_EXISTS":
            toast.error("该标签名称已存在");
            return;
          default: {
            reason satisfies never;
            toast.error("未知错误");
            return;
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: TAGS_KEYS.admin });
      setTagToEdit(null);
      toast.success("标签已重命名");
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: number) => {
      return await deleteTagFn({ data: { id } });
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error("删除失败: 标签不存在");
        return;
      }

      queryClient.invalidateQueries({ queryKey: TAGS_KEYS.admin });
      setTagToDelete(null);
      toast.success("标签已删除");
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      return await createTagFn({ data: { name } });
    },
    onSuccess: (result) => {
      if (result.error) {
        toast.error("该标签名称已存在");
        return;
      }

      queryClient.invalidateQueries({ queryKey: TAGS_KEYS.admin });
      setNewTagName("");
      setIsCreating(false);
      toast.success("标签已创建");
    },
  });

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    createTagMutation.mutate(newTagName.trim());
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/30">
        <div className="space-y-1">
          <h1 className="text-3xl font-serif font-medium tracking-tight">
            标签管理
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              TAXONOMY_MANAGEMENT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group w-full md:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors"
              size={14}
            />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索标签..."
              className="pl-9 h-9 bg-transparent border-b border-border/50 rounded-none focus:border-foreground focus:ring-0 pr-0 transition-all font-mono text-xs"
            />
          </div>
          <Button
            onClick={() => setIsCreating(true)}
            size="sm"
            className="h-9 px-4 text-[10px] uppercase tracking-[0.2em] font-medium rounded-none gap-2 bg-foreground text-background hover:bg-foreground/90"
          >
            <Hash size={12} />
            新建标签
          </Button>
        </div>
      </div>

      {/* Stats/Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "总标签数", value: tags.length, suffix: "" },
          {
            label: "使用中",
            value: tags.filter((t) => t.postCount > 0).length,
            suffix: "个",
          },
          {
            label: "空置",
            value: tags.filter((t) => t.postCount === 0).length,
            suffix: "个",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-6 border border-border/30 bg-background/50 hover:bg-accent/5 transition-colors group"
          >
            <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-2 group-hover:text-foreground transition-colors">
              {stat.label}
            </div>
            <div className="text-3xl font-serif text-foreground">
              {stat.value}
              <span className="text-xs text-muted-foreground ml-2 font-mono">
                {stat.suffix}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Creation Row (Inline) */}
      {isCreating && (
        <form
          onSubmit={handleCreateTag}
          className="flex items-center gap-4 p-4 border border-border/30 bg-muted/5 animate-in slide-in-from-top-2 duration-300"
        >
          <span className="text-sm font-mono text-emerald-500 font-bold">
            {">"}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            NEW_TAG:
          </span>
          <div className="flex-1">
            <input
              autoFocus
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="输入标签名称..."
              className="w-full bg-transparent border-none outline-none font-mono text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              disabled={createTagMutation.isPending}
              className="h-8 text-[10px] uppercase font-mono tracking-widest hover:text-emerald-500 hover:bg-emerald-500/10 rounded-none"
            >
              {createTagMutation.isPending ? "创建中..." : "[ 确认 ]"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsCreating(false)}
              className="h-8 text-[10px] uppercase font-mono tracking-widest text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-none"
            >
              [ 取消 ]
            </Button>
          </div>
        </form>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-4 border border-border/30 bg-background animate-pulse space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-accent rounded" />
                <div className="h-4 w-8 bg-accent rounded" />
              </div>
              <div className="h-3 w-32 bg-accent rounded" />
              <div className="flex justify-end gap-2 pt-2">
                <div className="h-6 w-12 bg-accent rounded" />
                <div className="h-6 w-12 bg-accent rounded" />
              </div>
            </div>
          ))
        ) : filteredTags.length > 0 ? (
          filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="p-4 border border-border/30 bg-background space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  {tagToEdit?.id === tag.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        autoFocus
                        value={tagToEdit.name}
                        onChange={(e) =>
                          setTagToEdit({
                            ...tagToEdit,
                            name: e.target.value,
                          })
                        }
                        className="h-8 text-sm"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-emerald-500"
                        onClick={() => updateTagMutation.mutate(tagToEdit)}
                      >
                        <Check size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => setTagToEdit(null)}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Hash size={14} className="text-muted-foreground/50" />
                      <span className="font-medium text-foreground">
                        {tag.name}
                      </span>
                    </div>
                  )}
                  <div className="text-[10px] font-mono text-muted-foreground">
                    CREATED: {new Date(tag.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-mono font-bold text-foreground">
                    {tag.postCount}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    POSTS
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border/30 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  onClick={() => setTagToEdit({ id: tag.id, name: tag.name })}
                >
                  [ 编辑 ]
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-red-500"
                  onClick={() => setTagToDelete({ id: tag.id, name: tag.name })}
                >
                  [ 删除 ]
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center border border-border/30 bg-background text-muted-foreground">
            <span className="text-xs font-serif italic">
              没有找到匹配的标签
            </span>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-background border border-border/30 rounded-none shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border/30 bg-muted/5">
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    标签名称
                    <ArrowUpDown
                      size={10}
                      className={cn(sortBy === "name" && "text-foreground")}
                    />
                  </button>
                </th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal">
                  <button
                    onClick={() => toggleSort("postCount")}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    文章数量
                    <ArrowUpDown
                      size={10}
                      className={cn(
                        sortBy === "postCount" && "text-foreground",
                      )}
                    />
                  </button>
                </th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal hidden lg:table-cell">
                  <button
                    onClick={() => toggleSort("createdAt")}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    创建时间
                    <ArrowUpDown
                      size={10}
                      className={cn(
                        sortBy === "createdAt" && "text-foreground",
                      )}
                    />
                  </button>
                </th>
                <th className="px-6 py-3 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-normal text-right">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-6">
                      <div className="h-4 w-32 bg-accent rounded-none" />
                    </td>
                    <td className="px-6 py-6">
                      <div className="h-4 w-12 bg-accent rounded-none" />
                    </td>
                    <td className="px-6 py-6 hidden lg:table-cell">
                      <div className="h-4 w-24 bg-accent rounded-none" />
                    </td>
                    <td className="px-6 py-6">
                      <div className="h-4 w-16 bg-accent rounded-none ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredTags.length > 0 ? (
                filteredTags.map((tag) => (
                  <tr
                    key={tag.id}
                    className="group hover:bg-muted/5 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 font-medium">
                      {tagToEdit?.id === tag.id ? (
                        <div className="flex items-center gap-2 max-w-xs animate-in fade-in duration-200">
                          <Input
                            autoFocus
                            value={tagToEdit.name}
                            onChange={(e) =>
                              setTagToEdit({
                                ...tagToEdit,
                                name: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                updateTagMutation.mutate(tagToEdit);
                              if (e.key === "Escape") setTagToEdit(null);
                            }}
                            className="h-7 py-0 text-sm border-0 border-b border-foreground rounded-none focus-visible:ring-0 px-1 bg-transparent"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                            onClick={() => updateTagMutation.mutate(tagToEdit)}
                          >
                            <Check size={14} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                            onClick={() => setTagToEdit(null)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Hash
                            size={12}
                            className="text-muted-foreground/30"
                          />
                          <span className="text-foreground tracking-tight font-mono text-sm">
                            {tag.name}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-muted-foreground">
                        {tag.postCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[10px] text-muted-foreground/60 font-mono hidden lg:table-cell">
                      {new Date(tag.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-none"
                          onClick={() =>
                            setTagToEdit({ id: tag.id, name: tag.name })
                          }
                        >
                          [ 编辑 ]
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] font-mono text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-none"
                          onClick={() =>
                            setTagToDelete({ id: tag.id, name: tag.name })
                          }
                        >
                          [ 删除 ]
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-24 text-center space-y-4">
                    <Search size={24} className="opacity-20 mx-auto" />
                    <div className="text-muted-foreground font-serif text-sm italic">
                      没有找到匹配的标签
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                      className="text-[10px] uppercase tracking-widest h-auto p-0 text-muted-foreground hover:text-foreground"
                    >
                      [ 清除搜索 ]
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!tagToDelete}
        onClose={() => setTagToDelete(null)}
        onConfirm={() =>
          tagToDelete && deleteTagMutation.mutate(tagToDelete.id)
        }
        title="删除标签"
        message={`确定要删除标签 "${tagToDelete?.name}" 吗？此操作不可撤销。关联该标签的文章将不再显示该标签。`}
        confirmLabel="确认删除"
        isLoading={deleteTagMutation.isPending}
      />
    </div>
  );
}
