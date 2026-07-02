import type { ReactNode } from "react";

export type Column<T> = {
  /** chave unica da coluna (usada como key de React) */
  key: string;
  /** rotulo do cabecalho / label no card mobile */
  header: string;
  /** conteudo da celula para uma linha */
  render: (_row: T) => ReactNode;
  /**
   * Se true, no mobile vira o titulo do card (sem rotulo, em destaque) em vez
   * de uma linha rotulo/valor. Use na coluna mais identificadora.
   */
  primary?: boolean;
  /** esconde esta coluna no card mobile (ainda aparece na tabela desktop) */
  hideOnMobile?: boolean;
};

/**
 * Tabela responsiva: renderiza uma <table> no desktop (>= md) e, no mobile,
 * cada linha vira um card empilhado com pares rotulo/valor. Resolve o overflow
 * horizontal de tabelas em telas estreitas sem scroll lateral.
 */
export function ResponsiveTable<T>({
  columns,
  rows,
  keyExtractor,
  empty = "Nenhum registro encontrado.",
}: {
  columns: Column<T>[];
  rows: T[];
  keyExtractor: (_row: T) => string;
  empty?: ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-1 py-6 text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
        {empty}
      </p>
    );
  }

  return (
    <>
      {/* Desktop: tabela */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--acolhe-border)" }}>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--acolhe-muted-fg)" }}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={keyExtractor(row)}
                style={{ borderBottom: "1px solid var(--acolhe-border)" }}
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3" style={{ color: "var(--acolhe-fg)" }}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards empilhados */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => {
          const primary = columns.find((c) => c.primary);
          const rest = columns.filter((c) => !c.primary && !c.hideOnMobile);
          return (
            <div
              key={keyExtractor(row)}
              className="rounded-lg p-3"
              style={{
                backgroundColor: "var(--acolhe-card)",
                border: "1px solid var(--acolhe-border)",
              }}
            >
              {primary && (
                <div className="mb-2 text-sm font-semibold" style={{ color: "var(--acolhe-fg)" }}>
                  {primary.render(row)}
                </div>
              )}
              <dl className="flex flex-col gap-1.5">
                {rest.map((c) => (
                  <div key={c.key} className="flex items-start justify-between gap-3 text-sm">
                    <dt
                      className="flex-shrink-0 text-xs font-medium uppercase tracking-wide"
                      style={{ color: "var(--acolhe-muted-fg)" }}
                    >
                      {c.header}
                    </dt>
                    <dd className="text-right" style={{ color: "var(--acolhe-fg)" }}>
                      {c.render(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </>
  );
}
