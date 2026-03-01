import { Link } from "@tanstack/react-router";
import { Github, Mail, Rss } from "lucide-react";
import { blogConfig } from "@/blog.config";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside className={`cuckoo-sidebar ${className || ""}`}>
      {/* Cover Image */}
      <div className="relative h-32 overflow-hidden">
        <img
          src={blogConfig.theme.cuckoo.coverImage}
          alt="cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
      </div>

      {/* Avatar and Info */}
      <div className="px-6 pb-6 -mt-12 relative z-10">
        <Link to="/" className="block mx-auto w-fit" aria-label="返回首页">
          <img
            src={blogConfig.theme.cuckoo.avatar}
            alt={blogConfig.author}
            className="cuckoo-avatar"
          />
        </Link>

        <div className="text-center mt-4">
          <h1 className="text-xl font-bold cuckoo-text-primary mb-1">
            {blogConfig.author}
          </h1>
          <p className="cuckoo-text-secondary text-sm mb-4">
            {blogConfig.description}
          </p>

          {/* Social Links */}
          <div className="flex justify-center gap-3">
            <a
              href={blogConfig.social.github}
              target="_blank"
              rel="me noreferrer"
              aria-label="GitHub"
              className="cuckoo-btn cuckoo-btn-secondary h-10 w-10 p-0"
            >
              <Github size={18} strokeWidth={1.5} />
            </a>
            <a
              href="/rss.xml"
              target="_blank"
              rel="noreferrer"
              aria-label="RSS"
              className="cuckoo-btn cuckoo-btn-secondary h-10 w-10 p-0"
            >
              <Rss size={18} strokeWidth={1.5} />
            </a>
            <a
              href={`mailto:${blogConfig.social.email}`}
              aria-label="Email"
              className="cuckoo-btn cuckoo-btn-secondary h-10 w-10 p-0"
            >
              <Mail size={18} strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-4 py-2">
        <ul className="space-y-1">
          <li>
            <Link
              to="/"
              className="block px-4 py-2.5 rounded-lg cuckoo-text-secondary hover:cuckoo-text-primary hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              首页
            </Link>
          </li>
          <li>
            <Link
              to="/posts"
              className="block px-4 py-2.5 rounded-lg cuckoo-text-secondary hover:cuckoo-text-primary hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              文章
            </Link>
          </li>
          <li>
            <Link
              to="/friend-links"
              className="block px-4 py-2.5 rounded-lg cuckoo-text-secondary hover:cuckoo-text-primary hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              友情链接
            </Link>
          </li>
          <li>
            <Link
              to="/search"
              className="block px-4 py-2.5 rounded-lg cuckoo-text-secondary hover:cuckoo-text-primary hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              搜索
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
