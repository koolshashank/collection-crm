"use client";

import { createContext, useContext } from "react";

const CompanyConfigContext = createContext(null);

/** config is read server-side once (in app/layout.js) and passed down as a
 * plain prop — no extra client fetch/waterfall needed to show branding. */
export function CompanyConfigProvider({ config, children }) {
  return <CompanyConfigContext.Provider value={config}>{children}</CompanyConfigContext.Provider>;
}

export function useCompanyConfig() {
  const ctx = useContext(CompanyConfigContext);
  if (!ctx) throw new Error("useCompanyConfig must be used inside <CompanyConfigProvider>");
  return ctx;
}
