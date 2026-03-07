type ArticleJsonLdInput = {
  authorName: string;
  canonicalHref: string;
  post: {
    slug: string;
    summary?: string | null;
    title: string;
    publishedAt?: Date | string | null;
    updatedAt: Date | string;
    tags?: Array<{ name: string }> | undefined;
  };
};

export function buildCanonicalHref(
  pathname: string,
  searchParams?: Record<string, string | undefined>,
) {
  const normalizedPath =
    pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";

  if (!searchParams) return normalizedPath;

  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `${normalizedPath}?${query}` : normalizedPath;
}

export function buildCanonicalUrl(
  domain: string,
  pathname: string,
  searchParams?: Record<string, string | undefined>,
) {
  return `https://${domain}${buildCanonicalHref(pathname, searchParams)}`;
}

export function canonicalLink(href: string) {
  return {
    rel: "canonical",
    href,
  } as const;
}

export function buildArticleJsonLd({
  authorName,
  canonicalHref,
  post,
}: ArticleJsonLdInput) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    url: canonicalHref,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalHref,
    },
    author: {
      "@type": "Person",
      name: authorName,
    },
    dateModified: new Date(post.updatedAt).toISOString(),
  };

  if (post.summary) {
    jsonLd.description = post.summary;
  }

  if (post.publishedAt) {
    jsonLd.datePublished = new Date(post.publishedAt).toISOString();
  }

  const keywords = post.tags?.map((tag) => tag.name).filter(Boolean);
  if (keywords?.length) {
    jsonLd.keywords = keywords;
  }

  return JSON.stringify(jsonLd);
}
