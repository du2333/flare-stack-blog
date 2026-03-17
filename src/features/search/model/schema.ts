import type { Orama, Tokenizer } from "@orama/orama";
import { create } from "@orama/orama";

const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });

export const chineseTokenizerConfig: Tokenizer = {
  language: "chinese",
  tokenize: (text: string) => {
    return Array.from(segmenter.segment(text))
      .filter((x) => x.isWordLike)
      .map((x) => x.segment.toLowerCase());
  },
  normalizationCache: new Map(),
};

export const searchSchema = {
  id: "string",
  slug: "string",
  title: "string",
  summary: "string",
  content: "string",
  tags: "string[]",
} as const;

export type MyOramaDB = Orama<typeof searchSchema>;

export async function createMyDb() {
  return await create({
    schema: searchSchema,
    components: {
      tokenizer: chineseTokenizerConfig,
    },
  });
}
