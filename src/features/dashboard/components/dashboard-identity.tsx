import { Globe, UserRound } from "lucide-react";
import { useState } from "react";

function siteFavicon(siteUrl?: string) {
  if (!siteUrl) return undefined;
  try {
    const url = new URL(siteUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return new URL("/favicon.ico", url.origin).href;
  } catch {
    return undefined;
  }
}

/** Use submitted images first, then the site's favicon, then a local icon. */
export function DashboardIdentity({
  kind,
  image,
  siteUrl,
}: {
  kind: "site" | "user";
  image?: string | null;
  siteUrl?: string;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const favicon = kind === "site" ? siteFavicon(siteUrl) : undefined;
  const source = [image, favicon].find(
    (url): url is string => !!url && !failed.includes(url),
  );
  return (
    <span className="dashboard-icon dashboard-identity" aria-hidden="true">
      {source ? (
        <img
          key={source}
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className={source === favicon ? "dashboard-favicon" : undefined}
          onError={() =>
            setFailed((previous) =>
              previous.includes(source) ? previous : [...previous, source],
            )
          }
        />
      ) : kind === "site" ? (
        <Globe size={22} />
      ) : (
        <UserRound size={21} />
      )}
    </span>
  );
}
