import { useQueryClient } from "@tanstack/react-query";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Footer } from "@/components/layout/footer";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { Navbar } from "@/components/layout/navbar";
import { authClient } from "@/lib/auth/auth.client";
import { CACHE_CONTROL } from "@/lib/constants";
import { AUTH_KEYS } from "@/features/auth/queries";

export const Route = createFileRoute("/_public")({
  component: PublicLayout,
  headers: () => {
    return CACHE_CONTROL.public;
  },
});

function PublicLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navOptions = [
    { label: "主页", to: "/" as const, id: "home" },
    { label: "文章", to: "/posts" as const, id: "posts" },
    { label: "友链", to: "/friend-links" as const, id: "friend-links" },
  ];

  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const queryClient = useQueryClient();
  const logout = async () => {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error("会话终止失败, 请稍后重试。", {
        description: error.message,
      });
      return;
    }

    queryClient.removeQueries({ queryKey: AUTH_KEYS.session });

    toast.success("会话已终止", {
      description: "你已安全退出当前会话。",
    });
  };
  // Global shortcut: Cmd/Ctrl + K to navigate to search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isToggle) {
        e.preventDefault();
        navigate({ to: "/search" });
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <div className="min-h-screen font-sans relative antialiased">
      {/* --- Minimalist Background --- */}
      <button className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,0,0,0.03)_0%,transparent_70%)] in-[.dark]:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.02)_0%,transparent_70%)]"></div>
      </button>

      <Navbar
        onMenuClick={() => setIsMenuOpen(true)}
        user={session?.user}
        isLoading={isSessionPending}
        navOptions={navOptions}
      />
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        user={session?.user}
        logout={logout}
        navOptions={navOptions}
      />
      <main className="flex flex-col min-h-screen relative z-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
