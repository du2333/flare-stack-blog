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
