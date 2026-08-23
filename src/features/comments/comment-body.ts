type CommentNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: { href?: unknown } }>;
  content?: Array<CommentNode>;
};

function linkHref(node: CommentNode): string | undefined {
  const href = node.marks?.find((mark) => mark.type === "link")?.attrs?.href;
  return typeof href === "string" && href.length > 0 ? href : undefined;
}

function flattenNode(node: CommentNode): string {
  if (node.type === "text") {
    const text = node.text ?? "";
    const href = linkHref(node);
    if (href && href !== text) {
      return `${text} ${href}`;
    }
    return text;
  }
  if (node.type === "hardBreak") {
    return "\n";
  }
  if (node.type === "image") {
    const src = node.attrs?.src;
    return typeof src === "string" && src.length > 0 ? `\n${src}\n` : "";
  }
  if (node.type === "doc") {
    return (node.content ?? []).map(flattenNode).join("\n");
  }
  return (node.content ?? []).map(flattenNode).join("");
}

export function jsonCommentToPlainText(content: unknown): string {
  if (content == null) {
    return "";
  }
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (trimmed.startsWith("{")) {
      try {
        return jsonCommentToPlainText(JSON.parse(content));
      } catch {
        return content;
      }
    }
    return content;
  }
  if (typeof content === "object") {
    return flattenNode(content as CommentNode).replace(
      /^[\n\r ]+|[\n\r ]+$/g,
      "",
    );
  }
  return String(content);
}

const URL_RE = /https?:\/\/[^\s<]+/gi;

function stripTrailingPunctuation(url: string): {
  href: string;
  trailing: string;
} {
  const href = url.replace(/[.,;:!?]+$/u, "");
  return { href, trailing: url.slice(href.length) };
}

function isHttpUrl(href: string): boolean {
  try {
    const parsed = new URL(href);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export type CommentBodyPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string };

export function splitCommentLine(line: string): Array<CommentBodyPart> {
  const parts: Array<CommentBodyPart> = [];
  const re = new RegExp(URL_RE.source, "gi");
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    const { href } = stripTrailingPunctuation(match[0]);
    if (!isHttpUrl(href)) {
      continue;
    }
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: line.slice(lastIndex, match.index) });
    }
    parts.push({ type: "link", value: href });
    lastIndex = match.index + href.length;
  }
  if (lastIndex < line.length) {
    parts.push({ type: "text", value: line.slice(lastIndex) });
  }
  return parts;
}
