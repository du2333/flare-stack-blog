import { ArchivePanel } from "../../components/archive/archive-panel";
import type { PostsPageProps } from "@/features/theme/contract/pages";

export function PostsPage({ posts }: PostsPageProps) {
  return (
    <div className="fuwari-onload-animation">
      <ArchivePanel posts={posts} />
    </div>
  );
}
