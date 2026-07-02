import type { ReactNode } from "react";

/**
 * Grade de cards de indicador (KPI). 2 colunas no mobile, 4 em telas >= sm.
 * Mantem os numeros legiveis em vez de uma unica coluna gigante no celular.
 */
export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">{children}</div>;
}
