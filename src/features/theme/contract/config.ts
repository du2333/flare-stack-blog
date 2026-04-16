/**
 * 主题契约 — 静态配置接口
 *
 * 主题通过导出 config 对象来声明数据获取参数，
 * route 层读取这些配置并透传给 query 层。
 */
export interface ThemeConfig {
  home: {
    /** 首页最近更新的文章数量 */
    recentPostsLimit: number;
    /** 首页热门文章数量 */
    popularPostsLimit: number;
  };
  posts: {
    /** 文章列表页每次加载的文章数量 */
    postsPerPage: number;
  };
  post: {
    /** 文章详情页显示的相关文章数量 */
    relatedPostsLimit: number;
  };
}
