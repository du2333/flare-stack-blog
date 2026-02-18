import { blogConfig } from "@/blog.config";

// 从环境变量读取 ICP 信息
const ICP_NUMBER = import.meta.env.VITE_ICP_NUMBER;
const ICP_URL = import.meta.env.VITE_ICP_URL || "https://beian.miit.gov.cn/";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/50 py-16 mt-32">
      <div className="max-w-3xl mx-auto px-6 md:px-0 flex flex-col md:flex-row justify-between items-center gap-8">
        {/* Brand / Copyright */}
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="font-serif text-lg font-bold tracking-tighter text-foreground">
            [ {blogConfig.name} ]
          </span>
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
            © {new Date().getFullYear()} {blogConfig.author}.
          </span>
          {/* ICP 备案 - 条件渲染，仅在配置时显示 */}
          {ICP_NUMBER && (
            <a
              href={ICP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] text-muted-foreground/60 hover:text-foreground transition-colors tracking-widest"
            >
              {ICP_NUMBER}
            </a>
          )}
        </div>

        {/* Minimalist Links */}
        <nav className="flex items-center gap-8 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
          <a href="/" className="hover:text-foreground transition-colors">
            Home
          </a>
          <a href="/posts" className="hover:text-foreground transition-colors">
            Posts
          </a>
          <a
            href={blogConfig.social.github}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Github
          </a>
          <a
            href={`mailto:${blogConfig.social.email}`}
            className="hover:text-foreground transition-colors"
          >
            Email
          </a>
        </nav>
      </div>
    </footer>
  );
}
