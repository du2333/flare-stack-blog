import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const THEMES_DIR = path.join(process.cwd(), "src/features/theme/themes");

const THEME_NAME_REGEX = /^[a-z0-9-]+$/;

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(filePath)) {
    throw new Error(`File already exists: ${filePath}`);
  }
  fs.writeFileSync(filePath, content, "utf-8");
}

function createTheme(name: string): void {
  const themeDir = path.join(THEMES_DIR, name);

  if (fs.existsSync(themeDir)) {
    console.error(`\n错误：主题 "${name}" 已存在，目录 ${themeDir} 不为空。`);
    process.exit(1);
  }

  const files: Array<{ path: string; content: string }> = [];

  // styles/index.css
  files.push({
    path: path.join(themeDir, "styles/index.css"),
    content: `/* Theme: ${name} */\n@import "tailwindcss";\n@import "@/styles/shared.css";\n`,
  });

  // layouts
  files.push({
    path: path.join(themeDir, "layouts/public-layout.tsx"),
    content: `import type { PublicLayoutProps } from "@/features/theme/contract/layouts";

export function PublicLayout(_props: PublicLayoutProps) {
  return <div>Placeholder: PublicLayout</div>;
}
`,
  });

  files.push({
    path: path.join(themeDir, "layouts/auth-layout.tsx"),
    content: `import type { AuthLayoutProps } from "@/features/theme/contract/layouts";

export function AuthLayout(_props: AuthLayoutProps) {
  return <div>Placeholder: AuthLayout</div>;
}
`,
  });

  files.push({
    path: path.join(themeDir, "layouts/user-layout.tsx"),
    content: `import type { UserLayoutProps } from "@/features/theme/contract/layouts";

export function UserLayout(_props: UserLayoutProps) {
  return <div>Placeholder: UserLayout</div>;
}
`,
  });

  // page + skeleton + index for each page with skeleton
  const pageWithSkeleton = [
    { dir: "home", page: "HomePage", props: "HomePageProps" },
    { dir: "posts", page: "PostsPage", props: "PostsPageProps" },
    { dir: "post", page: "PostPage", props: "PostPageProps" },
    {
      dir: "friend-links",
      page: "FriendLinksPage",
      props: "FriendLinksPageProps",
    },
  ] as const;

  for (const { dir, page, props } of pageWithSkeleton) {
    const base = path.join(themeDir, "pages", dir);
    files.push({
      path: path.join(base, "page.tsx"),
      content: `import type { ${props} } from "@/features/theme/contract/pages";

export function ${page}(_props: ${props}) {
  return <div>Placeholder: ${page}</div>;
}
`,
    });
    files.push({
      path: path.join(base, "skeleton.tsx"),
      content: `export function ${page}Skeleton() {
  return <div>Placeholder: ${page}Skeleton</div>;
}
`,
    });
    files.push({
      path: path.join(base, "index.ts"),
      content: `export { ${page} } from "./page";
export { ${page}Skeleton } from "./skeleton";
`,
    });
  }

  // Standard pages (page + index only)
  const standardPages = [
    { dir: "search", page: "SearchPage", props: "SearchPageProps" },
    {
      dir: "submit-friend-link",
      page: "SubmitFriendLinkPage",
      props: "SubmitFriendLinkPageProps",
    },
    { dir: "auth/login", page: "LoginPage", props: "LoginPageProps" },
    { dir: "auth/register", page: "RegisterPage", props: "RegisterPageProps" },
    {
      dir: "auth/forgot-password",
      page: "ForgotPasswordPage",
      props: "ForgotPasswordPageProps",
    },
    {
      dir: "auth/reset-password",
      page: "ResetPasswordPage",
      props: "ResetPasswordPageProps",
    },
    {
      dir: "auth/verify-email",
      page: "VerifyEmailPage",
      props: "VerifyEmailPageProps",
    },
  ] as const;

  for (const { dir, page, props } of standardPages) {
    const base = path.join(themeDir, "pages", dir);
    files.push({
      path: path.join(base, "page.tsx"),
      content: `import type { ${props} } from "@/features/theme/contract/pages";

export function ${page}(_props: ${props}) {
  return <div>Placeholder: ${page}</div>;
}
`,
    });
    files.push({
      path: path.join(base, "index.ts"),
      content: `export { ${page} } from "./page";
`,
    });
  }

  // user/profile
  const profileBase = path.join(themeDir, "pages/user/profile");
  files.push({
    path: path.join(profileBase, "page.tsx"),
    content: `import type { ProfilePageProps } from "@/features/theme/contract/pages";

export function ProfilePage(_props: ProfilePageProps) {
  return <div>Placeholder: ProfilePage</div>;
}
`,
  });
  files.push({
    path: path.join(profileBase, "index.ts"),
    content: `export { ProfilePage } from "./page";
`,
  });

  // index.ts
  files.push({
    path: path.join(themeDir, "index.ts"),
    content: `import "./styles/index.css";
import { HomePage, HomePageSkeleton } from "./pages/home";
import { PostsPage, PostsPageSkeleton } from "./pages/posts";
import { PostPage, PostPageSkeleton } from "./pages/post";
import { PublicLayout } from "./layouts/public-layout";
import { AuthLayout } from "./layouts/auth-layout";
import { UserLayout } from "./layouts/user-layout";
import { FriendLinksPage, FriendLinksPageSkeleton } from "./pages/friend-links";
import { SearchPage } from "./pages/search";
import {
  SubmitFriendLinkPage,
} from "./pages/submit-friend-link";
import { LoginPage } from "./pages/auth/login";
import { RegisterPage } from "./pages/auth/register";
import { ForgotPasswordPage } from "./pages/auth/forgot-password";
import { ResetPasswordPage } from "./pages/auth/reset-password";
import { VerifyEmailPage } from "./pages/auth/verify-email";
import { ProfilePage } from "./pages/user/profile";
import type { ThemeComponents } from "@/features/theme/contract/components";

/**
 * Theme: ${name} — implements the full ThemeComponents contract.
 * TypeScript will error at compile time if any required component is missing.
 */
export default {
  HomePage,
  HomePageSkeleton,
  PostsPage,
  PostsPageSkeleton,
  PostPage,
  PostPageSkeleton,
  PublicLayout,
  AuthLayout,
  UserLayout,
  FriendLinksPage,
  FriendLinksPageSkeleton,
  SearchPage,
  SubmitFriendLinkPage,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
  ProfilePage,
} satisfies ThemeComponents;
`,
  });

  for (const { path: filePath, content } of files) {
    writeFile(filePath, content);
  }

  console.log(`\n✅ 主题 "${name}" 已创建于 ${themeDir}`);
  console.log("\n后续步骤：");
  console.log('  1. 在 vite.config.ts 的 z.enum(["default"]) 中加入新主题名');
  console.log(`  2. 在 .env 中设置 THEME=${name} 并启动开发`);
}

async function main() {
  console.log("创建新主题\n");

  const input = await prompt(
    "请输入主题名称（仅允许小写字母、数字、连字符，如 my-theme）: ",
  );

  if (!input) {
    console.error("\n错误：主题名称不能为空。");
    process.exit(1);
  }

  const name = input.toLowerCase().replace(/\s+/g, "-");

  if (!THEME_NAME_REGEX.test(name)) {
    console.error(
      `\n错误：主题名称 "${name}" 无效。仅允许小写字母、数字和连字符（a-z, 0-9, -）。`,
    );
    process.exit(1);
  }

  createTheme(name);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
