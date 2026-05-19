"use client";

import { RegisterRoleChoiceModal } from "@/components/auth/RegisterRoleChoiceModal";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type OpenRegisterModalOptions = {
  /** Runs after the modal closes (e.g. redirect when user dismisses role pick on `/register`). */
  onClose?: () => void;
};

type RegisterModalContextValue = {
  openRegisterModal: (options?: OpenRegisterModalOptions) => void;
  closeRegisterModal: () => void;
};

const RegisterModalContext = createContext<RegisterModalContextValue | null>(null);

export function RegisterModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const onCloseRef = useRef<(() => void) | null>(null);

  const openRegisterModal = useCallback((options?: OpenRegisterModalOptions) => {
    onCloseRef.current = options?.onClose ?? null;
    setOpen(true);
  }, []);

  const closeRegisterModal = useCallback(() => {
    setOpen(false);
    const extra = onCloseRef.current;
    onCloseRef.current = null;
    extra?.();
  }, []);

  const value = useMemo(
    () => ({ openRegisterModal, closeRegisterModal }),
    [openRegisterModal, closeRegisterModal],
  );

  return (
    <RegisterModalContext.Provider value={value}>
      {children}
      <RegisterRoleChoiceModal open={open} onClose={closeRegisterModal} />
    </RegisterModalContext.Provider>
  );
}

export function useRegisterModal(): RegisterModalContextValue {
  const ctx = useContext(RegisterModalContext);
  if (!ctx) {
    throw new Error("useRegisterModal must be used within RegisterModalProvider");
  }
  return ctx;
}

/** Safe on pages that may render outside the provider (no-op open). */
export function useRegisterModalOptional(): RegisterModalContextValue | null {
  return useContext(RegisterModalContext);
}
