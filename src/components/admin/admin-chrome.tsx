import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AdminPrimaryAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
} | null;

type AdminChromeValue = {
  primaryAction: AdminPrimaryAction;
  setPrimaryAction: (action: AdminPrimaryAction) => void;
};

const AdminChromeContext = createContext<AdminChromeValue | null>(null);

export function AdminChromeProvider({ children }: { children: ReactNode }) {
  const [primaryAction, setPrimaryAction] = useState<AdminPrimaryAction>(null);
  const value = useMemo(
    () => ({ primaryAction, setPrimaryAction }),
    [primaryAction],
  );

  return (
    <AdminChromeContext.Provider value={value}>
      {children}
    </AdminChromeContext.Provider>
  );
}

export function useAdminChrome() {
  const value = useContext(AdminChromeContext);
  if (!value) {
    throw new Error("useAdminChrome must be used within AdminChromeProvider");
  }
  return value;
}
