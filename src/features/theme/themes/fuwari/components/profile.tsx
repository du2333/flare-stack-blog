import { Link } from "@tanstack/react-router";
import { Github, Mail, Rss } from "lucide-react";
import { blogConfig } from "@/blog.config";

export function Profile() {
  return (
    <div className="fuwari-card-base p-4">
      <Link
        to="/"
        className="group block relative mx-auto mb-3 max-w-48 lg:max-w-none overflow-hidden rounded-xl active:scale-95"
        aria-label="返回首页"
      >
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 group-hover:bg-black/30 group-active:bg-black/50 transition-colors pointer-events-none" />
        <img
          src={blogConfig.theme.fuwari.avatar}
          alt=""
          className="w-full h-auto aspect-square object-cover"
        />
      </Link>
      <div className="px-2 text-center">
        <div className="font-bold text-xl fuwari-text-90 mb-1">
          {blogConfig.author}
        </div>
        <div
          className="h-1 w-5 rounded-full mx-auto mb-2"
          style={{ backgroundColor: "var(--fuwari-primary)" }}
        />
        <div className="fuwari-text-50 text-sm mb-2.5">
          {blogConfig.description}
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <a
            href={blogConfig.social.github}
            target="_blank"
            rel="me noreferrer"
            aria-label="GitHub"
            className="fuwari-btn-regular rounded-lg h-10 w-10 active:scale-90 hover:text-(--fuwari-primary) transition-colors"
          >
            <Github size={20} strokeWidth={1.5} />
          </a>
          <a
            href="/rss.xml"
            target="_blank"
            rel="noreferrer"
            aria-label="RSS"
            className="fuwari-btn-regular rounded-lg h-10 w-10 active:scale-90 hover:text-(--fuwari-primary) transition-colors"
          >
            <Rss size={20} strokeWidth={1.5} />
          </a>
          <a
            href={`mailto:${blogConfig.social.email}`}
            aria-label="Email"
            className="fuwari-btn-regular rounded-lg h-10 w-10 active:scale-90 hover:text-(--fuwari-primary) transition-colors"
          >
            <Mail size={20} strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </div>
  );
}
