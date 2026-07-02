"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Shield } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar, FilterField, FilterInput } from "@/components/ui/filter-bar";
import { ResponsiveTable, type Column } from "@/components/ui/responsive-table";

type AuditItem = {
  id: string;
  criadoEm: string | Date;
  usuario?: { nome: string } | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
};

const columns: Column<AuditItem>[] = [
  {
    key: "data",
    header: "Data",
    render: (item) => new Date(item.criadoEm).toLocaleString("pt-BR"),
  },
  {
    key: "usuario",
    header: "Usuario",
    primary: true,
    render: (item) => item.usuario?.nome ?? "Sistema",
  },
  {
    key: "acao",
    header: "Acao",
    render: (item) => (
      <span
        className="inline-block rounded-full px-2 py-1 text-xs font-medium"
        style={{ backgroundColor: "var(--acolhe-primary-light)", color: "var(--acolhe-primary)" }}
      >
        {item.acao}
      </span>
    ),
  },
  {
    key: "entidade",
    header: "Entidade",
    render: (item) => item.entidade,
  },
  {
    key: "id",
    header: "ID",
    render: (item) => (
      <span className="font-mono text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
        {item.entidadeId ?? "—"}
      </span>
    ),
  },
];

export default function AuditPage() {
  const [filtroEntidade, setFiltroEntidade] = useState<string>("");
  const [filtroAcao, setFiltroAcao] = useState<string>("");

  const { data } = trpc.audit.listar.useQuery({
    limit: 50,
    entidade: filtroEntidade || undefined,
    acao: filtroAcao || undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        icon={<Shield className="h-7 w-7" style={{ color: "var(--acolhe-primary)" }} />}
      />

      <FilterBar>
        <FilterField label="Entidade">
          <FilterInput
            value={filtroEntidade}
            onChange={(e) => setFiltroEntidade(e.target.value)}
            placeholder="Ex: ImportJob, Visita"
          />
        </FilterField>
        <FilterField label="Acao">
          <FilterInput
            value={filtroAcao}
            onChange={(e) => setFiltroAcao(e.target.value)}
            placeholder="Ex: CREATE, UPDATE"
          />
        </FilterField>
      </FilterBar>

      <div
        className="rounded-xl p-3 sm:p-5"
        style={{
          backgroundColor: "var(--acolhe-card)",
          border: "1px solid var(--acolhe-border)",
          boxShadow: "var(--acolhe-shadow-sm)",
        }}
      >
        <ResponsiveTable
          columns={columns}
          rows={(data?.items ?? []) as AuditItem[]}
          keyExtractor={(item) => item.id}
          empty="Nenhum registro de audit log encontrado."
        />

        {data?.nextCursor && (
          <p className="mt-4 text-center text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
            Mostrando primeiros {data.items.length} registros
          </p>
        )}
      </div>
    </div>
  );
}
