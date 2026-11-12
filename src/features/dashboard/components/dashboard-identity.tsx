import { UserRound } from "lucide-react";
import { useState } from "react";

/** A commenter's picture, or a local icon when there is none or it fails. */
export function DashboardIdentity({ image }: { image?: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="dashboard-icon dashboard-identity" aria-hidden="true">
      {image && !failed ? (
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <UserRound size={21} />
      )}
    </span>
  );
}
