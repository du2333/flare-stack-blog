import { serializeMcpDate } from "../../../service/mcp-serialize";

export function serializeMcpFriendLink(friendLink: {
  id: number;
  siteName: string;
  siteUrl: string;
  description: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  userId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  user?: {
    name: string;
  } | null;
}) {
  return {
    id: friendLink.id,
    siteName: friendLink.siteName,
    siteUrl: friendLink.siteUrl,
    description: friendLink.description,
    logoUrl: friendLink.logoUrl,
    contactEmail: friendLink.contactEmail,
    status: friendLink.status,
    rejectionReason: friendLink.rejectionReason,
    userId: friendLink.userId,
    userName: friendLink.user?.name ?? null,
    createdAt: serializeMcpDate(friendLink.createdAt),
    updatedAt: serializeMcpDate(friendLink.updatedAt),
  };
}
