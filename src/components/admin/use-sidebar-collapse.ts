import { useEffect, useState } from "react";
import {
  initialSidebarState,
  isSidebarCollapsed,
  leaveEditor,
  serializeSidebarPreference,
  toggleSidebar,
} from "./sidebar-state";

export function useSidebarCollapse(preference: boolean, inEditor: boolean) {
  const [state, setState] = useState(() => initialSidebarState(preference));

  useEffect(() => {
    if (!inEditor) setState(leaveEditor);
  }, [inEditor]);

  const toggle = () => {
    const next = toggleSidebar(state, inEditor);
    setState(next);
    if (!inEditor)
      document.cookie = serializeSidebarPreference(next.preference);
  };

  return { collapsed: isSidebarCollapsed(state, inEditor), toggle };
}
