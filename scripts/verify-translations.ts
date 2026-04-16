import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The localization messages are located in 'messages' directory
const messagesDir = path.resolve(__dirname, "../messages");
const zhPath = path.join(messagesDir, "zh.json");
const enPath = path.join(messagesDir, "en.json");

try {
  const zhContent = JSON.parse(fs.readFileSync(zhPath, "utf8"));
  const enContent = JSON.parse(fs.readFileSync(enPath, "utf8"));

  // Get keys from source language file, excluding the schema property
  const zhKeys = Object.keys(zhContent).filter((k) => k !== "$schema");

  // Find which ones are missing in the target language file
  const missingKeys = zhKeys.filter((key) => !(key in enContent));

  if (missingKeys.length > 0) {
    console.error(
      `❌ Found ${missingKeys.length} missing translation keys in en.json:`,
    );
    missingKeys.forEach((key) => {
      console.error(`  - ${key}`);
    });
    process.exit(1);
  } else {
    console.log(
      "✅ Translation verification passed: All keys from zh.json are present in en.json.",
    );
    process.exit(0);
  }
} catch (error) {
  console.error("❌ Error verifying translations:", error);
  process.exit(1);
}
