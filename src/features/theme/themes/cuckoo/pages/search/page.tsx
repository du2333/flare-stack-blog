import { ArrowLeft, Search } from "lucide-react";
import type { SearchPageProps } from "@/features/theme/contract/pages";

export function SearchPage({
  query,
  results,
  isSearching,
  onQueryChange,
  onSelectPost,
  onBack,
}: SearchPageProps) {
  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="cuckoo-card p-6 cuckoo-fade-in">
        <button
          onClick={onBack}
          className="flex items-center gap-2 cuckoo-text-secondary hover:cuckoo-primary transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">返回</span>
        </button>

        <h1 className="text-2xl font-bold cuckoo-text-primary mb-4">
          搜索文章
        </h1>

        {/* Search Input */}
        <div className="relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 cuckoo-text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="输入关键词搜索..."
            className="cuckoo-input pl-12 py-3"
            autoFocus
          />
        </div>
      </div>

      {/* Search Results */}
      <div className="cuckoo-card p-6 min-h-[400px]">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-[var(--cuckoo-primary)] border-t-transparent rounded-full" />
            <p className="cuckoo-text-muted mt-4">搜索中...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            <p className="cuckoo-text-secondary text-sm">
              找到 {results.length} 条结果
            </p>
            {results.map((result) => (
              <div
                key={result.post.id}
                onClick={() => onSelectPost(result.post.slug)}
                className="cuckoo-post-card cursor-pointer"
              >
                <h3 className="cuckoo-post-card-title">{result.post.title}</h3>
                {result.matches.summary && (
                  <p
                    className="cuckoo-text-secondary text-sm line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html: result.matches.summary,
                    }}
                  />
                )}
                <div className="cuckoo-post-card-meta mt-3">
                  {result.post.tags.length > 0 && (
                    <div className="flex gap-2">
                      {result.post.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="cuckoo-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : query ? (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="cuckoo-text-muted">未找到相关结果</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="cuckoo-text-muted">输入关键词开始搜索</p>
          </div>
        )}
      </div>
    </div>
  );
}
