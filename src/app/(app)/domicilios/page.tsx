"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Home,
  Search,
  ChevronRight,
  X,
  ChevronLeft,
  ChevronRight as ChevronRightArrow,
} from "lucide-react";
import { NovaVisitaModal } from "@/components/nova-visita-modal";

const STATUS_CONFIG: Record<
  "em_dia" | "proximo_prazo" | "atrasado",
  { label: string; color: string; bg: string }
> = {
  em_dia: { label: "Em dia", color: "var(--acolhe-success)", bg: "var(--acolhe-success-light)" },
  proximo_prazo: {
    label: "Atencao",
    color: "var(--acolhe-warning)",
    bg: "var(--acolhe-warning-light)",
  },
  atrasado: { label: "Atrasado", color: "var(--acolhe-danger)", bg: "var(--acolhe-danger-light)" },
};

const VISITA_STATUS_TO_DISPLAY: Record<string, "em_dia" | "proximo_prazo" | "atrasado"> = {
  REALIZADA: "em_dia",
  PENDENTE: "proximo_prazo",
  AUSENTE: "proximo_prazo",
  RECUSADA: "atrasado",
  CANCELADA: "atrasado",
};

const VISITA_STATUS_LABEL: Record<string, string> = {
  REALIZADA: "Realizada",
  PENDENTE: "Pendente",
  AUSENTE: "Ausente",
  RECUSADA: "Recusada",
  CANCELADA: "Cancelada",
};

const CONDICAO_LABEL: Record<string, string> = {
  HIPERTENSO: "Hipertenso",
  DIABETICO: "Diabetico",
  GESTANTE: "Gestante",
  CARDIACO: "Cardiaco",
  ACAMADO: "Acamado",
  BEBE: "Bebe",
  IDOSO: "Idoso",
};

export default function DomiciliosPage() {
  const [search, setSearch] = useState("");
  const [equipeId, setEquipeId] = useState<string>("all");
  const [microareaId, setMicroareaId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"em_dia" | "proximo_prazo" | "atrasado" | "all">(
    "all",
  );
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showVisita, setShowVisita] = useState(false);

  const utils = trpc.useUtils();
  const { data: prefeituras } = trpc.prefeitura.list.useQuery();
  const prefeituraId = prefeituras?.[0]?.id;

  const { data: equipes } = trpc.equipe.listByPrefeitura.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const { data: microareas } = trpc.microarea.list.useQuery(
    { equipeId: equipeId === "all" ? undefined : equipeId },
    { enabled: !!prefeituraId },
  );

  const { data } = trpc.domicilio.list.useQuery(
    {
      prefeituraId,
      equipeId: equipeId === "all" ? undefined : equipeId,
      microareaId: microareaId === "all" ? undefined : microareaId,
      status: statusFilter,
      search: search || undefined,
      page,
      perPage: 20,
    },
    { enabled: !!prefeituraId },
  );

  const { data: detail } = trpc.domicilio.getById.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId },
  );

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col lg:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="space-y-4 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--acolhe-primary-light)" }}
          >
            <Home size={20} style={{ color: "var(--acolhe-primary)" }} />
          </div>
          <div>
            <h1
              className="text-2xl font-bold leading-tight"
              style={{
                fontFamily: "var(--font-plus-jakarta), sans-serif",
                color: "var(--acolhe-fg)",
              }}
            >
              Domicilios
            </h1>
            <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
              Gestao de familias cadastradas no territorio
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex min-w-64 flex-1 items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: "var(--acolhe-muted)" }}
          >
            <Search size={16} style={{ color: "var(--acolhe-muted-fg)" }} />
            <input
              placeholder="Buscar por endereco, bairro ou morador"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--acolhe-fg)" }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <FilterSelect
            value={equipeId}
            onChange={(v) => {
              setEquipeId(v);
              setMicroareaId("all");
              setPage(1);
            }}
          >
            <option value="all">Todas as equipes</option>
            {equipes?.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.nome}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            value={microareaId}
            onChange={(v) => {
              setMicroareaId(v);
              setPage(1);
            }}
          >
            <option value="all">Todas as microareas</option>
            {microareas?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.codigo}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v as typeof statusFilter);
              setPage(1);
            }}
          >
            <option value="all">Todos os status</option>
            <option value="em_dia">Em dia</option>
            <option value="proximo_prazo">Atencao</option>
            <option value="atrasado">Atrasado</option>
          </FilterSelect>
        </div>

        {data && (
          <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
            {data.total} domicilios encontrados · pagina {page} de {data.pages || 1}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* List */}
        <div className="min-w-0 flex-1 overflow-y-auto pr-1">
          {!data ? (
            <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
              Carregando...
            </p>
          ) : data.items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              <div
                className="hidden gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider lg:grid"
                style={{
                  color: "var(--acolhe-muted-fg)",
                  gridTemplateColumns: "2fr 1fr 0.7fr 1fr 1fr 0.3fr",
                }}
              >
                <div>Endereco</div>
                <div>Microarea</div>
                <div className="text-center">Moradores</div>
                <div>Ultima visita</div>
                <div>Status</div>
                <div />
              </div>

              {data.items.map((d) => {
                const status = (d.statusVisita ?? "atrasado") as keyof typeof STATUS_CONFIG;
                const config = STATUS_CONFIG[status];
                const isSelected = selectedId === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedId(isSelected ? null : d.id)}
                    className="flex w-full flex-col gap-2 rounded-lg px-4 py-3 text-left transition-all lg:grid lg:gap-4"
                    style={{
                      ["--cols" as string]: "2fr 1fr 0.7fr 1fr 1fr 0.3fr",
                      gridTemplateColumns: "var(--cols, 2fr 1fr 0.7fr 1fr 1fr 0.3fr)",
                      border: `1px solid ${
                        isSelected ? "var(--acolhe-primary)" : "var(--acolhe-border)"
                      }`,
                      backgroundColor: isSelected
                        ? "var(--acolhe-primary-light)"
                        : "var(--acolhe-card)",
                      boxShadow: "var(--acolhe-shadow-sm)",
                    }}
                  >
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-semibold"
                        style={{ color: "var(--acolhe-fg)" }}
                      >
                        {d.logradouro}, {d.numero}
                      </p>
                      <p className="truncate text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                        {d.bairro}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs lg:text-sm">
                      <span
                        className="font-semibold uppercase tracking-wider lg:hidden"
                        style={{ color: "var(--acolhe-muted-fg)" }}
                      >
                        Microarea:
                      </span>
                      {d.microarea ? (
                        <>
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ backgroundColor: d.microarea.equipe.cor }}
                          />
                          <span className="font-medium" style={{ color: "var(--acolhe-fg)" }}>
                            {d.microarea.codigo}
                          </span>
                        </>
                      ) : (
                        <span style={{ color: "var(--acolhe-muted-fg)" }}>—</span>
                      )}
                    </div>

                    <div
                      className="flex items-center justify-start gap-2 text-xs lg:justify-center lg:text-sm"
                      style={{ color: "var(--acolhe-fg)" }}
                    >
                      <span
                        className="font-semibold uppercase tracking-wider lg:hidden"
                        style={{ color: "var(--acolhe-muted-fg)" }}
                      >
                        Moradores:
                      </span>
                      <span className="font-medium">{d._count.moradores}</span>
                    </div>

                    <div
                      className="flex items-center gap-2 text-xs lg:text-sm"
                      style={{ color: "var(--acolhe-fg)" }}
                    >
                      <span
                        className="font-semibold uppercase tracking-wider lg:hidden"
                        style={{ color: "var(--acolhe-muted-fg)" }}
                      >
                        Ultima:
                      </span>
                      {d.ultimaVisita
                        ? new Date(d.ultimaVisita).toLocaleDateString("pt-BR")
                        : "Nunca"}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: config.bg, color: config.color }}
                      >
                        {config.label}
                      </span>
                      <ChevronRight
                        size={16}
                        className="lg:hidden"
                        style={{ color: "var(--acolhe-muted-fg)" }}
                      />
                    </div>

                    <div className="hidden items-center justify-end lg:flex">
                      <ChevronRight size={16} style={{ color: "var(--acolhe-muted-fg)" }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {data && data.pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-8 items-center gap-1 rounded-md px-3 text-xs disabled:opacity-50"
                style={{
                  backgroundColor: "var(--acolhe-card)",
                  border: "1px solid var(--acolhe-border)",
                  color: "var(--acolhe-fg)",
                }}
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <span className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                {page} / {data.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages}
                className="flex h-8 items-center gap-1 rounded-md px-3 text-xs disabled:opacity-50"
                style={{
                  backgroundColor: "var(--acolhe-card)",
                  border: "1px solid var(--acolhe-border)",
                  color: "var(--acolhe-fg)",
                }}
              >
                Proxima <ChevronRightArrow size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Drawer */}
        {selectedId && detail && (
          <aside
            className="fixed inset-0 z-50 flex w-full flex-col overflow-hidden bg-[var(--acolhe-card)] lg:static lg:z-auto lg:w-96 lg:rounded-xl"
            style={{
              border: "1px solid var(--acolhe-border)",
              boxShadow: "var(--acolhe-shadow-md)",
            }}
          >
            <div
              className="sticky top-0 flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--acolhe-border)" }}
            >
              <h2
                className="text-base font-semibold"
                style={{
                  fontFamily: "var(--font-plus-jakarta), sans-serif",
                  color: "var(--acolhe-fg)",
                }}
              >
                Detalhes do domicilio
              </h2>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-md p-1 transition-colors"
                style={{ color: "var(--acolhe-muted-fg)" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
              <button
                onClick={() => setShowVisita(true)}
                className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  backgroundColor: "var(--acolhe-primary)",
                  boxShadow: "var(--acolhe-shadow-sm)",
                }}
              >
                + Registrar visita
              </button>

              <Section label="Endereco">
                <p className="text-sm font-medium" style={{ color: "var(--acolhe-fg)" }}>
                  {detail.logradouro}, {detail.numero}
                </p>
                {detail.complemento && (
                  <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                    {detail.complemento}
                  </p>
                )}
                <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                  {detail.bairro}
                  {detail.cep ? ` · CEP ${detail.cep}` : ""}
                </p>
              </Section>

              {detail.microarea && (
                <Section label="Microarea">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: detail.microarea.equipe.cor }}
                    />
                    <span className="text-sm font-medium" style={{ color: "var(--acolhe-fg)" }}>
                      {detail.microarea.codigo} · {detail.microarea.equipe.nome}
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                    {detail.microarea.equipe.ubs.nome}
                  </p>
                </Section>
              )}

              <Section label={`Moradores (${detail.moradores.length})`}>
                <div className="space-y-2">
                  {detail.moradores.map((m) => {
                    const idade = calcularIdade(m.nascimento);
                    const condicoes = (Array.isArray(m.condicoes) ? m.condicoes : []) as string[];
                    return (
                      <div
                        key={m.id}
                        className="rounded-lg p-3"
                        style={{ backgroundColor: "var(--acolhe-muted)" }}
                      >
                        <p className="text-sm font-semibold" style={{ color: "var(--acolhe-fg)" }}>
                          {m.nome}
                        </p>
                        <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                          {idade} anos · {m.sexo === "FEMININO" ? "Feminino" : "Masculino"}
                        </p>
                        {condicoes.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {condicoes.map((c) => (
                              <span
                                key={c}
                                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                style={{
                                  backgroundColor: "var(--acolhe-primary-light)",
                                  color: "var(--acolhe-primary)",
                                }}
                              >
                                {CONDICAO_LABEL[c] ?? c}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {detail.moradores.length === 0 && (
                    <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                      Nenhum morador cadastrado
                    </p>
                  )}
                </div>
              </Section>

              <Section label="Historico de visitas">
                <div className="space-y-3">
                  {detail.visitas.map((v) => {
                    const displayKey = VISITA_STATUS_TO_DISPLAY[v.status] ?? "atrasado";
                    const config = STATUS_CONFIG[displayKey];
                    return (
                      <div
                        key={v.id}
                        className="text-sm"
                        style={{
                          paddingLeft: 12,
                          borderLeft: `2px solid ${config.color}`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold" style={{ color: "var(--acolhe-fg)" }}>
                            {new Date(v.dataPrevista).toLocaleDateString("pt-BR")}
                          </p>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{ backgroundColor: config.bg, color: config.color }}
                          >
                            {VISITA_STATUS_LABEL[v.status] ?? v.status}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                          por {v.acs.usuario.nome}
                        </p>
                        {v.observacoes && (
                          <p className="mt-1 text-xs" style={{ color: "var(--acolhe-fg)" }}>
                            {v.observacoes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {detail.visitas.length === 0 && (
                    <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                      Nenhuma visita registrada
                    </p>
                  )}
                </div>
              </Section>
            </div>
          </aside>
        )}
      </div>

      {showVisita && detail && prefeituraId && (
        <NovaVisitaModal
          prefeituraId={prefeituraId}
          lockedDomicilio={{
            id: detail.id,
            label: `${detail.logradouro}, ${detail.numero}${
              detail.bairro ? ` · ${detail.bairro}` : ""
            }`,
            acsId: detail.microarea?.acsId ?? undefined,
          }}
          onClose={() => setShowVisita(false)}
          onCreated={() => {
            setShowVisita(false);
            void utils.domicilio.getById.invalidate({ id: detail.id });
            void utils.domicilio.list.invalidate();
          }}
        />
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (_v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg px-3 text-sm outline-none"
      style={{
        backgroundColor: "var(--acolhe-card)",
        border: "1px solid var(--acolhe-border)",
        color: "var(--acolhe-fg)",
      }}
    >
      {children}
    </select>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="mb-2 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--acolhe-muted-fg)" }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-xl"
        style={{ backgroundColor: "var(--acolhe-primary-light)" }}
      >
        <Home size={32} style={{ color: "var(--acolhe-primary)" }} />
      </div>
      <h3
        className="text-lg font-semibold"
        style={{
          fontFamily: "var(--font-plus-jakarta), sans-serif",
          color: "var(--acolhe-fg)",
        }}
      >
        Nenhum domicilio encontrado
      </h3>
      <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
        Ajuste os filtros ou importe um arquivo do e-SUS
      </p>
    </div>
  );
}

function calcularIdade(nascimento: Date | string): number {
  const nasc = new Date(nascimento);
  const now = new Date();
  let idade = now.getFullYear() - nasc.getFullYear();
  const m = now.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < nasc.getDate())) {
    idade--;
  }
  return idade;
}
