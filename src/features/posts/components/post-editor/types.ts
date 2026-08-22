import type { JSONContent } from "@tiptap/react";

export interface PostEditorData {
  title: string;
  summary: string;
  slug: string;
  contentJson: JSONContent | null;
  publishedAt: Date | null;
  pinnedAt: Date | null;
  tagIds: Array<number>;
  hasPublicSnapshot: boolean;
  serverToday: string;
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
  contentJson: null,
  publishedAt: null,
  pinnedAt: null,
  tagIds: [],
  hasPublicSnapshot: false,
  serverToday: "",
};
