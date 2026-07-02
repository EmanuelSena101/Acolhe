import type { ReactNode } from "react";

/**
 * Barra de filtros responsiva: empilha em coluna no mobile e vira linha que
 * quebra (flex-wrap) a partir de `lg`. Use com os campos `FilterField` /
 * `FilterInput` / `FilterSelect` abaixo para manter alvos de toque >= 44px.
 */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">{children}</div>
  );
}

export function FilterField({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-1 lg:w-auto">
      {label && (
        <label className="text-xs font-medium" style={{ color: "var(--acolhe-muted-fg)" }}>
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

const fieldClass = "h-11 w-full rounded-lg px-3 text-sm outline-none lg:h-9 lg:w-auto";
const fieldStyle = {
  backgroundColor: "var(--acolhe-card)",
  border: "1px solid var(--acolhe-border)",
  color: "var(--acolhe-fg)",
} as const;

export function FilterInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${fieldClass} ${className}`} style={fieldStyle} {...rest} />;
}

export function FilterSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select className={`${fieldClass} ${className}`} style={fieldStyle} {...rest}>
      {children}
    </select>
  );
}
