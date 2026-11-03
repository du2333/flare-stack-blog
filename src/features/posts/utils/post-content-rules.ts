import type { JSONContent } from "@tiptap/core";

/*
 * What a `contentJson` write may hold, the same rules Markdown writes follow
 * (ADR 0032): only node and mark types the editor schema knows, each with
 * only the attributes the schema gives it, and only images the server can
 * show. The lists are written out so a JSON write does not load the editor
 * schema; a test keeps them equal to it.
 */

/** Each node type of the editor schema, with its attributes. */
export const POST_NODE_ATTRIBUTES: Readonly<
  Record<string, ReadonlyArray<string>>
> = {
  doc: [],
  text: [],
  paragraph: [],
  heading: ["level", "id"],
  blockquote: [],
  bulletList: [],
  orderedList: ["start", "type"],
  listItem: [],
  codeBlock: ["language", "highlightedHtml"],
  horizontalRule: [],
  hardBreak: [],
  table: [],
  tableRow: [],
  tableHeader: ["colspan", "rowspan", "colwidth", "align"],
  tableCell: ["colspan", "rowspan", "colwidth", "align"],
  image: ["src", "alt", "title", "width", "height", "uploadId"],
  video: [
    "provider",
    "videoId",
    "page",
    "start",
    "title",
    "cover",
    "duration",
    "src",
    "pageUrl",
  ],
  inlineMath: ["latex"],
  blockMath: ["latex"],
};

/** Each mark type of the editor schema, with its attributes. */
export const POST_MARK_ATTRIBUTES: Readonly<
  Record<string, ReadonlyArray<string>>
> = {
  bold: [],
  italic: [],
  underline: [],
  strike: [],
  code: [],
  link: ["href", "target", "rel", "class", "title"],
};

/**
 * Attributes older editors stored that the schema no longer has. A body read
 * from an older draft or Post Revision still carries them, so a write may
 * too; `normalizePostContent` drops them before the body is stored.
 */
export const LEGACY_NODE_ATTRIBUTES: Readonly<
  Record<string, ReadonlyArray<string>>
> = {
  heading: ["data-toc-id"],
  image: ["align", "aspectRatio", "caption"],
};

export const POST_NODE_TYPES: ReadonlyArray<string> =
  Object.keys(POST_NODE_ATTRIBUTES);

export const POST_MARK_TYPES: ReadonlyArray<string> =
  Object.keys(POST_MARK_ATTRIBUTES);

function byType(lists: Readonly<Record<string, ReadonlyArray<string>>>) {
  return new Map(
    Object.entries(lists).map(([type, names]) => [type, new Set(names)]),
  );
}

const NODE_ATTRIBUTES = byType(POST_NODE_ATTRIBUTES);
const MARK_ATTRIBUTES = byType(POST_MARK_ATTRIBUTES);
const LEGACY_ATTRIBUTES = byType(LEGACY_NODE_ATTRIBUTES);

/**
 * The link attributes the public site gives out. It sets a link's `target`
 * and `rel` itself and shows no `class` from the body.
 */
const PUBLIC_MARK_ATTRIBUTES = new Map(MARK_ATTRIBUTES).set(
  "link",
  new Set(["href", "title"]),
);

export interface PostContentProblems {
  /** Node types the editor does not know, each once. */
  nodeTypes: Array<string>;
  /** Mark types the editor does not know, each once. */
  markTypes: Array<string>;
  /**
   * Attributes the editor does not give a known node or mark type, as
   * `type.attribute`, each once.
   */
  attributes: Array<string>;
  /** Sources of the images, in document order, to be checked by the caller. */
  imageSources: Array<string>;
}

function typeName(type: string | undefined) {
  return type === undefined || type === "" ? "(missing type)" : type;
}

/**
 * Unknown node and mark types in `contentJson`, unknown attributes of known
 * ones, and every image source. Legacy attributes are not unknown.
 */
export function inspectPostContent(
  contentJson: JSONContent,
): PostContentProblems {
  const nodeTypes = new Set<string>();
  const markTypes = new Set<string>();
  const attributes = new Set<string>();
  const imageSources: Array<string> = [];

  const checkAttributes = (
    type: string,
    attrs: Record<string, unknown> | undefined,
    known: Set<string>,
    legacy?: Set<string>,
  ) => {
    for (const name of Object.keys(attrs ?? {})) {
      if (!known.has(name) && !legacy?.has(name)) {
        attributes.add(`${type}.${name}`);
      }
    }
  };

  const visit = (node: JSONContent) => {
    const known = node.type ? NODE_ATTRIBUTES.get(node.type) : undefined;
    if (!node.type || !known) {
      nodeTypes.add(typeName(node.type));
    } else {
      checkAttributes(
        node.type,
        node.attrs,
        known,
        LEGACY_ATTRIBUTES.get(node.type),
      );
    }
    for (const mark of node.marks ?? []) {
      const knownMark = MARK_ATTRIBUTES.get(mark.type);
      if (!knownMark) markTypes.add(typeName(mark.type));
      else checkAttributes(mark.type, mark.attrs, knownMark);
    }
    if (node.type === "image") {
      const src = node.attrs?.src;
      imageSources.push(typeof src === "string" ? src : "");
    }
    node.content?.forEach(visit);
  };
  visit(contentJson);

  return {
    nodeTypes: [...nodeTypes],
    markTypes: [...markTypes],
    attributes: [...attributes],
    imageSources,
  };
}

function pick(
  attrs: Record<string, unknown> | undefined,
  names: Set<string> | undefined,
) {
  if (!attrs) return attrs;
  return Object.fromEntries(
    Object.entries(attrs).filter(([name]) => names?.has(name)),
  );
}

const NODE_KEYS = new Set(["type", "attrs", "content", "marks", "text"]);
const MARK_KEYS = new Set(["type", "attrs"]);

/**
 * `node` with only the attributes `markAttributes` and the node lists allow,
 * and only the keys a node or mark has. Keys keep their order, so a body
 * that loses nothing hashes as before.
 */
function keepingAttributes(
  node: JSONContent,
  markAttributes: Map<string, Set<string>>,
): JSONContent {
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (!NODE_KEYS.has(key)) continue;
    if (key === "attrs") {
      kept.attrs = pick(node.attrs, NODE_ATTRIBUTES.get(node.type ?? ""));
    } else if (key === "content") {
      kept.content = node.content?.map((child) =>
        keepingAttributes(child, markAttributes),
      );
    } else if (key === "marks") {
      kept.marks = node.marks?.map((mark) => {
        const keptMark: Record<string, unknown> = {};
        for (const [markKey, markValue] of Object.entries(mark)) {
          if (!MARK_KEYS.has(markKey)) continue;
          keptMark[markKey] =
            markKey === "attrs"
              ? pick(mark.attrs, markAttributes.get(mark.type))
              : markValue;
        }
        return keptMark;
      });
    } else {
      kept[key] = value;
    }
  }
  return kept as JSONContent;
}

/**
 * `contentJson` with only the attributes the editor schema gives each node
 * and mark, as a write would store it. Restoring a Post Revision saved by an
 * older editor uses it.
 */
export function withEditorAttributes(contentJson: JSONContent): JSONContent {
  return keepingAttributes(contentJson, MARK_ATTRIBUTES);
}

/**
 * `contentJson` as the public site gives it out: the editor's attributes,
 * except a link's `target`, `rel` and `class`, which the site sets itself.
 */
export function publicPostContent(contentJson: JSONContent): JSONContent {
  return keepingAttributes(contentJson, PUBLIC_MARK_ATTRIBUTES);
}
