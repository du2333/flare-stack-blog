import { z } from "zod";

export const PromptLanguageSchema = z
  .enum(["zh", "en", "auto"])
  .optional()
  .describe(
    "输出语言 / Output language: zh | en | auto。默认 / Default: auto.",
  );

export function createLanguageInstruction(language?: "zh" | "en" | "auto") {
  if (language === "zh") {
    return "Write the response in Chinese.";
  }

  if (language === "en") {
    return "Write the response in English.";
  }

  return "Match the user's language automatically. Prefer Chinese for Chinese requests and English for English requests.";
}
