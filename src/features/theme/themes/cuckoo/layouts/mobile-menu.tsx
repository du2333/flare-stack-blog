import { Link } from "@tanstack/react-router";
import { Github, Mail, Rss, X } from "lucide-react";
import type { NavOption, UserInfo } from "@/features/theme/contract/layouts";
import { blogConfig } from "@/blog.config";

interface MobileMenuProps {
  navOptions: Array<NavOption>;
  isOpen: boolean;
  onClose: () => void;
  user?: UserInfo;
  logout: () => Promise<void>;
}

export function MobileMenu({
  navOptions,
  isOpen,
  onClose,
  user,
  logout,
}: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 lg:hidden cuckoo-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-gray-900 z-50 lg:hidden cuckoo-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <span className="font-bold cuckoo-text-primary">菜单</span>
          <button
            onClick={onClose}
            className="cuckoo-btn cuckoo-btn-ghost h-10 w-10 p-0"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          <ul className="space-y-2">
            {navOptions.map((option) => (
              <li key={option.id}>
                <Link
                  to={option.to}
                  onClick={onClose}
                  className="block px-4 py-3 rounded-lg cuckoo-text-secondary hover:cuckoo-text-primary hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  {option.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        {user && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name}
                  className="cuckoo-avatar cuckoo-avatar-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <span className="cuckoo-text-primary font-medium">
                    {user.name[0]}
                  </span>
                </div>
              )}
              <div>
                <p className="cuckoo-text-primary font-medium text-sm">
                  {user.name}
                </p>
                {user.role && (
                  <p className="cuckoo-text-muted text-xs">{user.role}</p>
                )}
              </div>
            </div>
            <button
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="w-full cuckoo-btn cuckoo-btn-secondary py-2.5"
            >
              退出登录
            </button>
          </div>
        )}

        {/* Social Links */}
        <div className="absolute bottom-20 left-4 right-4 flex justify-center gap-3">
          <a
            href={blogConfig.social.github}
            target="_blank"
            rel="me noreferrer"
            aria-label="GitHub"
            className="cuckoo-btn cuckoo-btn-ghost h-10 w-10 p-0"
          >
            <Github size={18} />
          </a>
          <a
            href="/rss.xml"
            target="_blank"
            rel="noreferrer"
            aria-label="RSS"
            className="cuckoo-btn cuckoo-btn-ghost h-10 w-10 p-0"
          >
            <Rss size={18} />
          </a>
          <a
            href={`mailto:${blogConfig.social.email}`}
            aria-label="Email"
            className="cuckoo-btn cuckoo-btn-ghost h-10 w-10 p-0"
          >
            <Mail size={18} />
          </a>
        </div>
      </div>
    </>
  );
}
