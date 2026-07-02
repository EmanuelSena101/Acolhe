import type { ReactNode } from "react";

/**
 * Cabecalho padrao de pagina: titulo (+ icone opcional) a esquerda e acoes a
 * direita. No mobile as acoes quebram para baixo (flex-wrap) em vez de espremer.
 */
export function PageHeader({
  title,
  icon,
  subtitle,
  actions,
}: {
  title: string;
  icon?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h1
            className="text-xl font-bold sm:text-2xl"
            style={{
              fontFamily: "var(--font-plus-jakarta), sans-serif",
              color: "var(--acolhe-fg)",
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
