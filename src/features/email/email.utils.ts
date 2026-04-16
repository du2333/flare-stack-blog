import type { EmailUnsubscribeType } from "@/lib/db/schema";
export async function generateUnsubscribeToken(
  secret: string,
  userId: string,
  type: EmailUnsubscribeType,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${userId}:${type}`),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function verifyUnsubscribeToken(
  secret: string,
  userId: string,
  type: EmailUnsubscribeType,
  token: string,
): Promise<boolean> {
  const expectedToken = await generateUnsubscribeToken(secret, userId, type);
  return token === expectedToken;
}
