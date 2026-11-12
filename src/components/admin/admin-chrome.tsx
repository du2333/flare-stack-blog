import {
  createContext,
  isValidElement,
  useCallback,
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

/** An action registered through useAdminPrimaryAction, by its caller. */
interface PrimaryActionEntry {
  owner: string;
  /** Callers rank in render order, so a deeper component outranks its page. */
  rank: number;
  action: AdminPageAction;
}

type AdminChromeValue = {
  /** What the header and the top bar show. */
  primaryAction: AdminPageAction | null;
  /** Sets the action directly, for a page outside the frame (the editor). */
  setPrimaryAction: Dispatch<SetStateAction<AdminPageAction | null>>;
  nextRank: () => number;
  registerPrimaryAction: (entry: PrimaryActionEntry) => void;
  unregisterPrimaryAction: (owner: string) => void;
  mobileTitle: string | null;
  setMobileTitle: (title: string | null) => void;
};

const AdminChromeContext = createContext<AdminChromeValue | null>(null);

export function AdminChromeProvider({ children }: { children: ReactNode }) {
  const [direct, setPrimaryAction] = useState<AdminPageAction | null>(null);
  // Ordered by rank, the one shown last. When it leaves the one under it
  // comes back.
  const [entries, setEntries] = useState<Array<PrimaryActionEntry>>([]);
  const [mobileTitle, setMobileTitle] = useState<string | null>(null);
  const ranks = useRef(0);
  const nextRank = useCallback(() => ++ranks.current, []);
  const registerPrimaryAction = useCallback((entry: PrimaryActionEntry) => {
    setEntries((current) =>
      [...current.filter((item) => item.owner !== entry.owner), entry].sort(
        (a, b) => a.rank - b.rank,
      ),
    );
  }, []);
  const unregisterPrimaryAction = useCallback((owner: string) => {
    setEntries((current) => current.filter((item) => item.owner !== owner));
  }, []);
  const primaryAction = entries.at(-1)?.action ?? direct;
  const value = useMemo(
    () => ({
      primaryAction,
      setPrimaryAction,
      nextRank,
      registerPrimaryAction,
      unregisterPrimaryAction,
      mobileTitle,
      setMobileTitle,
    }),
    [
      primaryAction,
      nextRank,
      registerPrimaryAction,
      unregisterPrimaryAction,
      mobileTitle,
    ],
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

function shallowEqual(a: object, b: object) {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) =>
      Object.is(a[key as keyof typeof a], b[key as keyof typeof b]),
    )
  );
}

/** Two icons drawn the same: a fresh `<Plus size={16} />` each render is one icon. */
function sameIcon(a: ReactNode, b: ReactNode) {
  if (Object.is(a, b)) return true;
  if (!isValidElement(a) || !isValidElement(b)) return false;
  return (
    a.type === b.type &&
    a.key === b.key &&
    shallowEqual(a.props as object, b.props as object)
  );
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

/**
 * Makes `action` the page's primary action while the caller is mounted: the
 * frame header and the phone top bar show it. Any component inside a page
 * may call it, e.g. a tab's content under a shared header. The deepest one
 * mounted is shown; when it leaves, the one it covered comes back.
 *
 * The header gets a copy, so what the action says is registered again when
 * the label, the state or the icon change; the click handler and the ref are
 * read from the latest call, so a new function each render costs nothing.
 */
export function useAdminPrimaryAction(
  action: AdminPageAction | null | undefined,
) {
  const { nextRank, registerPrimaryAction, unregisterPrimaryAction } =
    useAdminChrome();
  const owner = useId();
  const [rank] = useState(nextRank);
  const latest = useRef(action);
  latest.current = action;
  const present = action != null;
  const label = action?.label;
  const disabled = action?.disabled;
  const loading = action?.loading;
  const ref = action?.ref;
  const icon = useRef(action?.icon);
  if (!sameIcon(icon.current, action?.icon)) icon.current = action?.icon;
  const stableIcon = icon.current;

  // The header's button, handed on to whatever ref the caller passes now.
  const node = useRef<HTMLButtonElement | null>(null);
  const forwardRef = useCallback((next: HTMLButtonElement | null) => {
    node.current = next;
    assignRef(latest.current?.ref, next);
  }, []);
  useEffect(() => {
    if (!present) return;
    assignRef(ref, node.current);
    return () => assignRef(ref, null);
  }, [present, ref]);

  useEffect(() => {
    if (!present || label === undefined) return;
    registerPrimaryAction({
      owner,
      rank,
      action: {
        label,
        icon: stableIcon,
        disabled,
        loading,
        onClick: () => latest.current?.onClick(),
        ref: forwardRef,
      },
    });
  }, [
    present,
    label,
    disabled,
    loading,
    stableIcon,
    forwardRef,
    owner,
    rank,
    registerPrimaryAction,
  ]);

  useEffect(() => {
    if (!present) return;
    return () => unregisterPrimaryAction(owner);
  }, [present, owner, unregisterPrimaryAction]);
}
