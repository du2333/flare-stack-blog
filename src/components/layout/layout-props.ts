/** Props shared by the public navigation and the auth and user layouts. */

export interface NavOption {
  id: string;
  label: string;
  href: string;
  external: boolean;
}

export interface UserInfo {
  name: string;
  image?: string | null;
  role?: string | null;
}

export interface AuthLayoutProps {
  onBack: () => void;
  children: React.ReactNode;
}

export interface UserLayoutProps {
  isAuthenticated: boolean;
  children: React.ReactNode;
}
