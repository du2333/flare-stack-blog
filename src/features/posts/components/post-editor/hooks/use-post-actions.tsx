import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { PostEditorData } from "@/features/posts/components/post-editor/types";
import { convertToPlainText, slugify } from "@/features/posts/utils/content";
import { orpc, orpcClient } from "@/lib/orpc";
import type { Tag } from "@/features/tags/tags.schema";
import { useDebounce } from "@/hooks/use-debounce";
import { m } from "@/paraglide/messages";

interface UsePostActionsOptions {
  postId: number;
  post: PostEditorData;
  setPost: React.Dispatch<React.SetStateAction<PostEditorData>>;
  setError: (error: string | null) => void;
  allTags: Array<Tag>;
}

export function usePostActions({
  postId,
  post,
  setPost,
  setError,
  allTags,
}: UsePostActionsOptions) {
  const queryClient = useQueryClient();

  const contentStats = useMemo(() => {
    const text = convertToPlainText(post.contentJson);
    const chars = text.replace(/\n/g, "").length;
    const cjkChars = (
      text.match(
        /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g,
      ) || []
    ).length;
    const textWithoutCjk = text.replace(
      /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g,
      " ",
    );
    const englishWords = textWithoutCjk.split(/\s+/).filter(Boolean).length;
    return { chars, words: cjkChars + englishWords, cjkChars, englishWords };
  }, [post.contentJson]);

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [processState, setProcessState] = useState<
    "IDLE" | "PROCESSING" | "SUCCESS"
  >("IDLE");

  const canPublish = useMemo(() => {
    if (!post.publishedAt) return true;
    return post.publishedAt.toISOString().slice(0, 10) <= post.serverToday;
  }, [post.publishedAt, post.serverToday]);

  // Keep track of how slug was requested to control noisy toasts
  const slugGenerationMode = useRef<"manual" | "auto">("manual");
  const prevTitleRef = useRef(post.title);
  const isFirstTitleMount = useRef(true);
  const debouncedTitle = useDebounce(post.title, 500);

  const invalidatePostQueries = () => {
    void queryClient.invalidateQueries({
      queryKey: orpc.posts.admin.get.key({ input: { id: postId } }),
    });
    void queryClient.invalidateQueries({
      queryKey: orpc.posts.admin.list.key(),
    });
    void queryClient.invalidateQueries({ queryKey: orpc.posts.list.key() });
  };

  const publishMutation = useMutation({
    mutationFn: () => orpcClient.posts.admin.publish({ id: postId }),
    onSuccess: () => {
      toast(m.editor_action_publish_start(), {
        description: m.editor_action_publish_desc(),
        icon: <Radio className="animate-pulse text-foreground" />,
        className:
          "bg-background/95 backdrop-blur-2xl border border-border rounded-sm",
      });
      setPost((prev) => ({ ...prev, hasPublicSnapshot: true }));
      setProcessState("SUCCESS");
      invalidatePostQueries();
      setTimeout(() => {
        setProcessState("IDLE");
      }, 3000);
    },
    onSettled: (_data, error) => {
      if (!error) return;
      setProcessState("IDLE");
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => orpcClient.posts.admin.unpublish({ id: postId }),
    onSuccess: () => {
      toast.success(m.editor_header_unpublish());
      setPost((prev) => ({ ...prev, hasPublicSnapshot: false }));
      setProcessState("SUCCESS");
      invalidatePostQueries();
      setTimeout(() => {
        setProcessState("IDLE");
      }, 3000);
    },
    onSettled: (_data, error) => {
      if (!error) return;
      setProcessState("IDLE");
    },
  });

  const handlePublish = () => {
    if (processState !== "IDLE") return;
    setProcessState("PROCESSING");
    publishMutation.mutate();
  };

  const handleUnpublish = () => {
    if (processState !== "IDLE") return;
    setProcessState("PROCESSING");
    unpublishMutation.mutate();
  };

  // Slug generation mutation
  const slugMutation = useMutation({
    mutationFn: (title: string) =>
      orpcClient.posts.admin.generateSlug({
        title,
        excludeId: postId,
      }),
    onSuccess: (result) => {
      setPost((prev) => ({ ...prev, slug: result.slug }));
      if (slugGenerationMode.current === "manual") {
        toast.success(m.editor_action_slug_set(), {
          description: m.editor_action_slug_set_desc({ slug: result.slug }),
        });
      }
    },
    onSettled: (_data, error) => {
      if (!error) return;
      console.error("Slug generation failed:", error);
      setError(m.editor_action_slug_error());
      const fallbackSlug = slugify(post.title) || "untitled-log";
      setPost((prev) => ({ ...prev, slug: fallbackSlug }));
    },
  });

  const previewSummaryMutation = useMutation({
    mutationFn: () =>
      orpcClient.posts.admin.previewSummary({
        contentJson: post.contentJson,
      }),
    onSuccess: (result) => {
      setPost((prev) => ({ ...prev, summary: result.summary }));
    },
  });

  // Auto-generate slug on title change (debounced)
  useEffect(() => {
    // Skip first mount to avoid regenerating slug on edit page load
    if (isFirstTitleMount.current) {
      isFirstTitleMount.current = false;
      prevTitleRef.current = debouncedTitle;
      return;
    }

    // Only run if title actually changed
    if (debouncedTitle === prevTitleRef.current) {
      return;
    }
    prevTitleRef.current = debouncedTitle;

    if (!debouncedTitle.trim()) {
      return;
    }
    if (slugMutation.isPending) return;
    slugGenerationMode.current = "auto";
    slugMutation.mutate(debouncedTitle);
  }, [debouncedTitle]);

  const handleGenerateSlug = () => {
    if (!post.title.trim()) {
      setError(m.editor_action_title_empty());
      return;
    }
    slugGenerationMode.current = "manual";
    slugMutation.mutate(post.title);
  };

  const handleGenerateSummary = () => {
    if (!post.contentJson) {
      toast.error(m.editor_action_no_content(), {
        description: m.editor_action_no_content_summary(),
      });
      return;
    }
    setIsGeneratingSummary(true);
    previewSummaryMutation.mutate(undefined, {
      onSettled: () => {
        setIsGeneratingSummary(false);
      },
    });
  };

  const handleGenerateTags = async () => {
    try {
      setIsGeneratingTags(true);
      const generatedTagNames = await orpcClient.tags.admin.generate({
        title: post.title,
        summary: post.summary,
        content:
          typeof post.contentJson === "string"
            ? post.contentJson
            : JSON.stringify(post.contentJson),
        existingTags: allTags.map((t) => t.name),
      });

      // Match or Create Tags
      const newTagIds: Array<number> = [];
      const currentTagIds = new Set(post.tagIds);

      for (const name of generatedTagNames) {
        const existingTag = allTags.find(
          (t) => t.name.toLowerCase() === name.toLowerCase(),
        );

        if (existingTag) {
          if (!currentTagIds.has(existingTag.id)) {
            newTagIds.push(existingTag.id);
            currentTagIds.add(existingTag.id);
          }
        } else {
          try {
            const created = await orpcClient.tags.admin.create({ name });
            newTagIds.push(created.id);
            currentTagIds.add(created.id);
          } catch {
            continue;
          }
        }
      }

      if (newTagIds.length > 0) {
        setPost((prev) => ({
          ...prev,
          tagIds: [...prev.tagIds, ...newTagIds],
        }));

        await queryClient.invalidateQueries({
          queryKey: orpc.tags.admin.list.key(),
        });

        toast.success(m.editor_action_tags_done(), {
          description: m.editor_action_tags_added({
            count: String(newTagIds.length),
          }),
        });
      } else {
        toast.info(m.editor_action_tags_done(), {
          description: m.editor_action_tags_none(),
        });
      }
    } catch (error) {
      console.error("Failed to generate tags:", error);
      toast.error(m.editor_action_tags_error(), {
        description:
          error instanceof Error
            ? error.message
            : m.editor_action_unknown_error(),
      });
    } finally {
      setIsGeneratingTags(false);
    }
  };

  return {
    isGeneratingSlug: slugMutation.isPending,
    isGeneratingSummary,
    handleGenerateSlug,
    handleGenerateSummary,
    handlePublish,
    handleUnpublish,
    processState,
    canPublish,
    isGeneratingTags,
    handleGenerateTags,
    contentStats,
  };
}
