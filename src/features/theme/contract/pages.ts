/**
 * 主题契约 — 页面 Props 接口
 *
 * 业务层（features/）通过这些接口向主题传递数据。
 * 主题可以选择使用或忽略其中的字段。
 *
 * 每个页面的类型定义位于 ./pages/ 目录下的对应文件中。
 */

export type * from "./pages/home";
export type * from "./pages/posts";
export type * from "./pages/post";
export type * from "./pages/friend-links";
export type * from "./pages/search";
export type * from "./pages/login";
export type * from "./pages/register";
export type * from "./pages/forgot-password";
export type * from "./pages/reset-password";
export type * from "./pages/verify-email";
export type * from "./pages/profile";
