import type { Node as ProsemirrorNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { getHighlighter, themes } from "@/lib/shiki";

const shikiPluginKey = new PluginKey("shiki");

// -----------------------------------------------------------------------------
// 1. 基础工具: FNV-1a Hash & LRU Cache
// -----------------------------------------------------------------------------

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

type TokenCacheValue = {
  tokens: Array<
    Array<{
      content: string;
      htmlStyle?: Record<string, string>;
      color?: string;
    }>
  >;
};

class LRUCache<TKey, TValue> {
  private cache = new Map<TKey, TValue>();
  constructor(private limit: number) {}

  get(key: TKey): TValue | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: TKey, value: TValue): void {
    if (this.cache.size >= this.limit) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

const tokenCache = new LRUCache<number, TokenCacheValue>(500);

// -----------------------------------------------------------------------------
// 2. 核心逻辑: 生成 Decoration
// -----------------------------------------------------------------------------

function styleToString(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

function generateDecorationsForBlock(
  pos: number,
  node: ProsemirrorNode,
  highlighter: Awaited<ReturnType<typeof getHighlighter>>,
): Array<Decoration> {
  const decorations: Array<Decoration> = [];
  const language = node.attrs.language || "plaintext";
  const code = node.textContent;

  const loadedLangs = highlighter.getLoadedLanguages();
  const safeLang = loadedLangs.includes(language) ? language : "plaintext";

  try {
    // 1. 获取 Tokens (带缓存)
    const cacheKey = fnv1a(`${safeLang}:${code}`);
    let tokensData = tokenCache.get(cacheKey);

    if (!tokensData) {
      const tokens = highlighter.codeToTokens(code, {
        lang: safeLang,
        themes: {
          light: themes.light,
          dark: themes.dark,
        },
      });
      tokensData = { tokens: tokens.tokens };
      tokenCache.set(cacheKey, tokensData);
    }

    // 2. 映射 Tokens 到 ProseMirror 位置
    let textOffset = 0;
    const startPos = pos + 1; // 跳过开始标签

    for (let i = 0; i < tokensData.tokens.length; i++) {
      const line = tokensData.tokens[i];

      // Token Merging: 合并相同样式的相邻 Token 以减少 DOM 节点
      let currentMerge: { from: number; style: string } | null = null;

      for (const token of line) {
        const tokenLen = token.content.length;
        const from = startPos + textOffset;
        const style = styleToString(token.htmlStyle || {});

        // [CRITICAL] 安全防御: 文本对齐检查
        // 如果 Shiki 解析的内容与文档当前内容不一致，说明偏移量错位，立即停止
        const pmText = code.slice(textOffset, textOffset + tokenLen);
        if (pmText !== token.content) {
          console.warn(
            `Shiki Desync at pos ${pos}: Expected '${token.content}', got '${pmText}'`,
          );
          return decorations; // 返回已生成的，防止后续乱码
        }

        if (currentMerge && currentMerge.style === style) {
          // 样式相同，继续合并，不做操作
        } else {
          // 样式改变，提交上一个合并段
          if (currentMerge && currentMerge.style) {
            decorations.push(
              Decoration.inline(currentMerge.from, from, {
                style: currentMerge.style,
              }),
            );
          }
          // 开始新的合并段
          currentMerge = { from, style };
        }

        textOffset += tokenLen;
      }

      // 提交行尾的最后一个合并段
      if (currentMerge && currentMerge.style) {
        decorations.push(
          Decoration.inline(currentMerge.from, startPos + textOffset, {
            style: currentMerge.style,
          }),
        );
      }

      // 处理换行符偏移量
      if (i < tokensData.tokens.length - 1) {
        if (textOffset < code.length) {
          if (code[textOffset] === "\n") {
            textOffset += 1;
          } else if (code[textOffset] === "\r") {
            // 处理 CRLF
            if (textOffset + 1 < code.length && code[textOffset + 1] === "\n") {
              textOffset += 2;
            } else {
              textOffset += 1;
            }
          } else {
            // 理论上不应该走到这里，除非 Shiki 自动补全了换行但源码没有
            textOffset += 1;
          }
        }
      }
    }
  } catch (e) {
    console.warn(`Shiki highlighting failed for ${language}:`, e);
  }

  return decorations;
}

// -----------------------------------------------------------------------------
// 3. Plugin 实现
// -----------------------------------------------------------------------------

// 辅助函数：查找所有代码块
function findAllCodeBlocks(doc: ProsemirrorNode, nodeTypeName: string) {
  const result: Array<{ pos: number; node: ProsemirrorNode }> = [];
  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (node.type.name === nodeTypeName) {
      result.push({ pos, node });
      return false;
    }
    return true;
  });
  return result;
}

export interface ShikiPluginOptions {
  name: string;
}

// 定义 Update Payload 类型：支持全量(boolean)或定点({ pos })
type ShikiUpdatePayload = boolean | { pos: number };

export function createShikiPlugin({ name }: ShikiPluginOptions): Plugin {
  let highlighterInstance: Awaited<ReturnType<typeof getHighlighter>> | null =
    null;
  let currentView: EditorView | null = null;
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  return new Plugin({
    key: shikiPluginKey,
    view(view: EditorView) {
      currentView = view;
      const initHighlighter = async () => {
        highlighterInstance = await getHighlighter();
        if (currentView) {
          // 初始化完成，触发全量刷新
          const tr = currentView.state.tr.setMeta("shikiReady", true);
          currentView.dispatch(tr);
        }
      };
      initHighlighter();

      return {
        update(updatedView) {
          currentView = updatedView;
        },
        destroy() {
          currentView = null;
          highlighterInstance = null;
          if (debounceTimeout) clearTimeout(debounceTimeout);
        },
      };
    },
    state: {
      init(_config: unknown, _state: EditorState): DecorationSet {
        return DecorationSet.empty;
      },
      apply(
        tr: Transaction,
        oldDecorations: DecorationSet,
        _oldState: EditorState,
        newState: EditorState,
      ): DecorationSet {
        if (!highlighterInstance) return DecorationSet.empty;

        const isShikiReady = tr.getMeta("shikiReady");
        const shikiUpdate: ShikiUpdatePayload = tr.getMeta("shikiUpdate");

        // 情况 A: 全量刷新 (初始化或强制刷新)
        if (isShikiReady || shikiUpdate === true) {
          const blocks = findAllCodeBlocks(newState.doc, name);
          const decorations = blocks.flatMap(({ pos, node }) =>
            generateDecorationsForBlock(pos, node, highlighterInstance!),
          );
          return DecorationSet.create(newState.doc, decorations);
        }

        // 情况 B: 默认先映射旧的 Decorations (处理非 dirty 区域)
        let newDecorations = oldDecorations.map(tr.mapping, newState.doc);

        // 情况 C: 定点刷新 (来自防抖回调)
        // 仅重新计算特定 pos 的代码块，性能极高
        if (
          shikiUpdate &&
          typeof shikiUpdate === "object" &&
          "pos" in shikiUpdate
        ) {
          const { pos } = shikiUpdate;
          // 确保节点仍然存在且是代码块
          const node = newState.doc.nodeAt(pos);
          if (node && node.type.name === name) {
            // 1. 移除该块旧的 decorations
            newDecorations = newDecorations.remove(
              newDecorations.find(pos, pos + node.nodeSize),
            );
            // 2. 生成新的
            const blockDecos = generateDecorationsForBlock(
              pos,
              node,
              highlighterInstance,
            );
            // 3. 添加
            return newDecorations.add(newState.doc, blockDecos);
          }
          return newDecorations;
        }

        // 情况 D: 增量更新 (用户正在打字)
        if (tr.docChanged) {
          // 计算变动范围
          let minFrom = Infinity;
          let maxTo = -Infinity;

          tr.steps.forEach((step, index) => {
            step.getMap().forEach((_oldStart, _oldEnd, newStart, newEnd) => {
              const mapping = tr.mapping.slice(index + 1);
              minFrom = Math.min(minFrom, mapping.map(newStart));
              maxTo = Math.max(maxTo, mapping.map(newEnd));
            });
          });

          if (minFrom !== Infinity && maxTo !== -Infinity) {
            // 稍微扩大搜索范围以确保覆盖完整的 Block
            const searchFrom = Math.max(0, minFrom - 1);
            const searchTo = Math.min(newState.doc.content.size, maxTo + 1);

            newState.doc.nodesBetween(searchFrom, searchTo, (node, pos) => {
              if (node.type.name === name) {
                const lineCount = node.textContent.split("\n").length;

                // [PERFORMANCE] 防抖策略
                // 如果代码块超过 100 行，则延迟渲染，避免输入卡顿
                if (lineCount > 100) {
                  if (debounceTimeout) clearTimeout(debounceTimeout);
                  debounceTimeout = setTimeout(() => {
                    if (currentView) {
                      // 这里的 pos 在异步执行时可能略有偏差，但通常对于 Block 级更新是可接受的
                      // 或者可以通过 currentView.state.doc.resolve(pos) 重新定位
                      const updateTr = currentView.state.tr.setMeta(
                        "shikiUpdate",
                        { pos },
                      );
                      currentView.dispatch(updateTr);
                    }
                  }, 300); // 300ms 延迟
                  return false; // 跳过本次同步更新
                }

                // 常规同步更新 (小代码块)
                newDecorations = newDecorations.remove(
                  newDecorations.find(pos, pos + node.nodeSize),
                );
                const blockDecos = generateDecorationsForBlock(
                  pos,
                  node,
                  highlighterInstance!,
                );
                newDecorations = newDecorations.add(newState.doc, blockDecos);

                return false; // 找到后不再深入子节点
              }
              return true;
            });
          }
        }

        return newDecorations;
      },
    },
    props: {
      decorations(state: EditorState): DecorationSet | undefined {
        return shikiPluginKey.getState(state) as DecorationSet | undefined;
      },
    },
  });
}
