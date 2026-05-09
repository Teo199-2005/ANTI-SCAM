import { useEffect, useState } from "react";

/**
 * True only after the client has mounted. Use to defer DOM that extensions
 * often mutate before React hydrates (e.g. fdprocessedid on buttons), which
 * would otherwise cause hydration warnings.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}
