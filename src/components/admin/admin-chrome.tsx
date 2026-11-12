import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type Ref,
  type SetStateAction,
} from "react";

/**
 * A page's one primary action. The page frame's header shows it, and so does
 * the top bar that takes the header's place on a phone.
 */
export interface AdminPageAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  /** The header's button, for a page that returns focus to it. */
  ref?: Ref<HTMLButtonElement>;
}

/** `owner` marks an action set through useAdminPrimaryAction. */
type AdminPrimaryAction = (AdminPageAction & { owner?: string }) | null;

type AdminChromeValue = {
  primaryAction: AdminPrimaryAction;
  setPrimaryAction: Dispatch<SetStateAction<AdminPrimaryAction>>;
  mobileTitle: string | null;
  setMobileTitle: (title: string | null) => void;
};

const AdminChromeContext = createContext<AdminChromeValue | null>(null);

export function AdminChromeProvider({ children }: { children: ReactNode }) {
  const [primaryAction, setPrimaryAction] = useState<AdminPrimaryAction>(null);
  const [mobileTitle, setMobileTitle] = useState<string | null>(null);
  const value = useMemo(
    () => ({ primaryAction, setPrimaryAction, mobileTitle, setMobileTitle }),
    [primaryAction, mobileTitle],
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

/**
 * Makes `action` the page's primary action while the caller is mounted: the
 * frame header and the phone top bar show it. Any component inside a page
 * may call it, e.g. a tab's content under a shared header; the last one
 * mounted wins, and leaving takes away only the caller's own action.
 */
export function useAdminPrimaryAction(
  action: AdminPageAction | null | undefined,
) {
  const { setPrimaryAction } = useAdminChrome();
  const owner = useId();
  const latest = useRef(action);
  latest.current = action;
  const present = action != null;
  const label = action?.label;
  const disabled = action?.disabled;
  const loading = action?.loading;

  useEffect(() => {
    if (!present) return;
    const current = latest.current;
    if (!current) return;
    setPrimaryAction({
      ...current,
      owner,
      onClick: () => latest.current?.onClick(),
    });
  }, [present, label, disabled, loading, owner, setPrimaryAction]);

  useEffect(() => {
    if (!present) return;
    return () =>
      setPrimaryAction((current) =>
        current?.owner === owner ? null : current,
      );
  }, [present, owner, setPrimaryAction]);
}
