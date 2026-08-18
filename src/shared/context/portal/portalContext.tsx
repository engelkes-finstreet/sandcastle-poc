"use client";

import { Portal } from "@/shared/types/Portal";
import { createContext, useContext, useState, ReactNode } from "react";

interface PortalContextType {
  portal: Portal;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export function PortalProvider({
  children,
  initialPortal,
}: {
  children: ReactNode;
  initialPortal: Portal;
}) {
  const [portal, _setPortal] = useState<Portal>(initialPortal);

  return (
    <PortalContext.Provider value={{ portal }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (context === undefined) {
    throw new Error("usePortal must be used within a PortalProvider");
  }
  return context;
}
