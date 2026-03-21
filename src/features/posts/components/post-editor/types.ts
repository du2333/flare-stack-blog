import type { JSONContent } from "@tiptap/react";
import type { PostStatus } from "@/lib/db/schema";

export interface PostEditorData {
  title: string;
  summary: string;
  slug: string;
  status: PostStatus;
  readTimeInMinutes: number;
  contentJson: JSONContent | null;
  publishedAt: Date | null;
  pinnedAt: Date | null;
  tagIds: Array<number>;
  isSynced: boolean;
  hasPublicCache: boolean;
}

export interface PostEditorProps {
  initialData: PostEditorData & { id: number };
  onSave: (data: PostEditorData) => Promise<void>;
}

export type SaveStatus = "SYNCED" | "SAVING" | "PENDING" | "ERROR";

export const defaultPostData: PostEditorData = {
  title: "",
  summary: "",
  slug: "",
  status: "draft",
  readTimeInMinutes: 1,
  contentJson: null,
  publishedAt: null,
  pinnedAt: null,
  tagIds: [],
  isSynced: true,
  hasPublicCache: false,
};
