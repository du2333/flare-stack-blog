import type { PostItem, PostWithToc } from "@/features/posts/posts.schema";
import type { TagWithCount } from "@/features/tags/tags.schema";
import type {
  FriendLinkWithUser,
  SubmitFriendLinkInput,
} from "@/features/friend-links/friend-links.schema";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { TurnstileProps } from "@/components/common/turnstile";

/**
 * 主题契约 — 页面 Props 接口
 *
 * 业务层（features/）通过这些接口向主题传递数据。
 * 主题可以选择使用或忽略其中的字段。
 */

export interface HomePageProps {
  posts: Array<PostItem>;
}

export interface PostsPageProps {
  posts: Array<PostItem>;
  tags: Array<Omit<TagWithCount, "createdAt">>;
  selectedTag?: string;
  onTagClick: (tag: string) => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export interface PostPageProps {
  post: Exclude<PostWithToc, null>;
}

export interface FriendLinksPageProps {
  links: Array<Omit<FriendLinkWithUser, "createdAt" | "updatedAt">>;
}

export interface SearchResultItem {
  post: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    tags: Array<string>;
  };
  score: number;
  matches: {
    title: string | null;
    summary: string | null;
    contentSnippet: string | null;
  };
}

export interface SearchPageProps {
  query: string;
  results: Array<SearchResultItem>;
  isSearching: boolean;
  onQueryChange: (query: string) => void;
  onSelectPost: (slug: string) => void;
  onBack: () => void;
}

export interface MyFriendLink {
  id: number;
  siteName: string;
  siteUrl: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  createdAt: Date | string;
}

export interface FriendLinkSubmitFormData {
  register: UseFormRegister<SubmitFriendLinkInput>;
  errors: FieldErrors<SubmitFriendLinkInput>;
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  isSubmitting: boolean;
  turnstileProps: TurnstileProps;
}

export interface SubmitFriendLinkPageProps {
  myLinks: Array<MyFriendLink>;
  form: FriendLinkSubmitFormData;
}
