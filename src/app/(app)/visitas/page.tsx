"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ClipboardList, Plus, X, AlertCircle, Search } from "lucide-react";
import { MapMiniature } from "@/components/map/map-miniature-lazy";
import { NovaVisitaModal } from "@/components/nova-visita-modal";

type Periodo = "semana" | "mes" | "tres_meses" | "all";
type StatusVisita = "PENDENTE" | "REALIZADA" | "RECUSADA" | "AUSENTE" | "CANCELADA" | "ATRASADA";

const STATUS_CONFIG: Record<StatusVisita, { label: string; color: string; bg: string }> = {
  REALIZADA: {
    label: "Realizada",
    color: "var(--acolhe-success)",
    bg: "var(--acolhe-success-light)",
  },
  PENDENTE: {
    label: "Pendente",
    color: "var(--acolhe-primary)",
    bg: "var(--acolhe-primary-light)",
  },
  ATRASADA: {
    label: "Atrasada",
    color: "var(--acolhe-danger)",
    bg: "var(--acolhe-danger-light)",
  },
  AUSENTE: {
    label: "Ausente",
    color: "var(--acolhe-warning)",
    bg: "var(--acolhe-warning-light)",
  },
  RECUSADA: {
    label: "Recusada",
    color: "var(--acolhe-danger)",
    bg: "var(--acolhe-danger-light)",
  },
  CANCELADA: {
    label: "Cancelada",
    color: "var(--acolhe-muted-fg)",
    bg: "var(--acolhe-muted)",
  },
};

const PERIODO_LABEL: Record<Periodo, string> = {
  semana: "Ultima semana",
  mes: "Este mes",
  tres_meses: "Ultimos 3 meses",
  all: "Todo o periodo",
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

export default function VisitasPage() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [statusFilter, setStatusFilter] = useState<StatusVisita | "all">("all");
  const [acsId, setAcsId] = useState<string>("all");
  const [microareaId, setMicroareaId] = useState<string>("all");
  const [equipeId, setEquipeId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

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

  const { data: kpis } = trpc.visita.kpis.useQuery(
    {
      prefeituraId,
      equipeId: equipeId === "all" ? undefined : equipeId,
      microareaId: microareaId === "all" ? undefined : microareaId,
      acsId: acsId === "all" ? undefined : acsId,
      periodo,
    },
    { enabled: !!prefeituraId },
  );

  const { data } = trpc.visita.list.useQuery(
    {
      prefeituraId,
      equipeId: equipeId === "all" ? undefined : equipeId,
      microareaId: microareaId === "all" ? undefined : microareaId,
      acsId: acsId === "all" ? undefined : acsId,
      status: statusFilter === "all" ? undefined : statusFilter,
      periodo,
      search: search || undefined,
      page,
      perPage: 20,
    },
    { enabled: !!prefeituraId },
  );

  const { data: detail } = trpc.visita.getById.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId },
  );

  const utils = trpc.useUtils();
  const atualizarMutation = trpc.visita.atualizar.useMutation({
    onSuccess: () => {
      void utils.visita.list.invalidate();
      void utils.visita.kpis.invalidate();
      void utils.visita.getById.invalidate();
    },
  });
  const cancelarMutation = trpc.visita.cancelar.useMutation({
    onSuccess: () => {
      void utils.visita.list.invalidate();
      void utils.visita.kpis.invalidate();
      void utils.visita.getById.invalidate();
    },
  });

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (periodo !== "mes")
    activeChips.push({
      key: "periodo",
      label: PERIODO_LABEL[periodo],
      onRemove: () => setPeriodo("mes"),
    });
  if (statusFilter !== "all") {
    activeChips.push({
      key: "status",
      label: STATUS_CONFIG[statusFilter].label,
      onRemove: () => setStatusFilter("all"),
    });
  }
  if (equipeId !== "all") {
    const eq = equipes?.find((e) => e.id === equipeId);
    if (eq) {
      activeChips.push({
        key: "equipe",
        label: eq.nome,
        onRemove: () => {
          setEquipeId("all");
          setMicroareaId("all");
        },
      });
    }
  }
  if (microareaId !== "all") {
    const m = microareas?.find((mm) => mm.id === microareaId);
    if (m)
      activeChips.push({
        key: "microarea",
        label: m.codigo,
        onRemove: () => setMicroareaId("all"),
      });
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col lg:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="space-y-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: "var(--acolhe-primary-light)" }}
            >
              <ClipboardList size={20} style={{ color: "var(--acolhe-primary)" }} />
            </div>
            <div>
              <h1
                className="text-2xl font-bold leading-tight"
                style={{
                  fontFamily: "var(--font-plus-jakarta), sans-serif",
                  color: "var(--acolhe-fg)",
                }}
              >
                Visitas
              </h1>
              <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
                Auditar fluxo de visitas realizadas, pendentes e atrasadas
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              backgroundColor: "var(--acolhe-primary)",
              boxShadow: "var(--acolhe-shadow-sm)",
            }}
          >
            <Plus size={16} />
            Nova visita
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-2 lg:space-y-3">
          <div
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: "var(--acolhe-muted)" }}
          >
            <Search size={16} style={{ color: "var(--acolhe-muted-fg)" }} />
            <input
              placeholder="Buscar morador, endereco ou bairro"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "var(--acolhe-fg)" }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:gap-3">
            <FilterSelect
              value={periodo}
              onChange={(v) => {
                setPeriodo(v as Periodo);
                setPage(1);
              }}
            >
              <option value="semana">Ultima semana</option>
              <option value="mes">Este mes</option>
              <option value="tres_meses">Ultimos 3 meses</option>
              <option value="all">Todo o periodo</option>
            </FilterSelect>

            <FilterSelect
              value={statusFilter}
              onChange={(v) => {
                setStatusFilter(v as StatusVisita | "all");
                setPage(1);
              }}
            >
              <option value="all">Todos os status</option>
              <option value="REALIZADA">Realizadas</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="ATRASADA">Atrasadas</option>
              <option value="AUSENTE">Ausentes</option>
              <option value="RECUSADA">Recusadas</option>
              <option value="CANCELADA">Canceladas</option>
            </FilterSelect>

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
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.map((c) => (
              <button
                key={c.key}
                onClick={c.onRemove}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-opacity hover:opacity-70"
                style={{
                  backgroundColor: "var(--acolhe-primary-light)",
                  color: "var(--acolhe-primary)",
                }}
              >
                {c.label}
                <X size={12} />
              </button>
            ))}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <KpiCard
            label="Realizadas"
            value={kpis?.realizadas ?? "—"}
            color="var(--acolhe-success)"
            bg="var(--acolhe-success-light)"
          />
          <KpiCard
            label="Pendentes"
            value={kpis?.pendentes ?? "—"}
            color="var(--acolhe-primary)"
            bg="var(--acolhe-primary-light)"
          />
          <KpiCard
            label="Atrasadas"
            value={kpis?.atrasadas ?? "—"}
            color="var(--acolhe-danger)"
            bg="var(--acolhe-danger-light)"
            highlight
          />
          <KpiCard
            label="Tempo medio"
            value={kpis?.tempoMedio ? `${kpis.tempoMedio} min` : "—"}
            color="var(--acolhe-muted-fg)"
            bg="var(--acolhe-muted)"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 gap-4">
        <div className="min-w-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {!data ? (
            <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
              Carregando...
            </p>
          ) : data.items.length === 0 ? (
            <EmptyState />
          ) : (
            data.items.map((v) => {
              const displayStatus: StatusVisita = v.isAtrasada
                ? "ATRASADA"
                : (v.status as StatusVisita);
              const config = STATUS_CONFIG[displayStatus];
              const isSelected = selectedId === v.id;
              const equipeCor = v.domicilio.microarea?.equipe.cor ?? "#6B6560";
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedId(isSelected ? null : v.id)}
                  className="w-full rounded-lg p-4 text-left transition-all"
                  style={{
                    backgroundColor: isSelected
                      ? "var(--acolhe-primary-light)"
                      : "var(--acolhe-card)",
                    border: `1px solid ${
                      isSelected ? "var(--acolhe-primary)" : "var(--acolhe-border)"
                    }`,
                    borderLeft: v.isAtrasada
                      ? `4px solid var(--acolhe-danger)`
                      : `1px solid ${
                          isSelected ? "var(--acolhe-primary)" : "var(--acolhe-border)"
                        }`,
                    boxShadow: "var(--acolhe-shadow-sm)",
                  }}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs"
                        style={{ backgroundColor: config.bg, color: config.color }}
                      >
                        {config.label}
                      </span>
                      <span
                        className="text-xs font-medium sm:text-sm"
                        style={{ color: "var(--acolhe-fg)" }}
                      >
                        {new Date(v.dataPrevista).toLocaleDateString("pt-BR")}
                      </span>
                      {v.dataRealizada && (
                        <span
                          className="text-[10px] sm:text-xs"
                          style={{ color: "var(--acolhe-muted-fg)" }}
                        >
                          as{" "}
                          {new Date(v.dataRealizada).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    {v.isAtrasada && v.diasAtraso !== null && (
                      <span
                        className="text-[10px] font-semibold sm:text-xs"
                        style={{ color: "var(--acolhe-danger)" }}
                      >
                        {v.diasAtraso} {v.diasAtraso === 1 ? "dia" : "dias"} de atraso
                      </span>
                    )}
                  </div>

                  <p className="mb-1 text-sm font-semibold" style={{ color: "var(--acolhe-fg)" }}>
                    {v.moradorPrincipal?.nome ?? "Sem morador cadastrado"}
                  </p>
                  <p className="mb-2 text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                    {v.domicilio.logradouro}, {v.domicilio.numero} · {v.domicilio.bairro}
                    {v.domicilio.microarea ? ` · ${v.domicilio.microarea.codigo}` : ""}
                  </p>

                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: equipeCor }}
                    >
                      {getInitials(v.acs.usuario.nome)}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: "var(--acolhe-fg)" }}>
                      {v.acs.usuario.nome}
                    </span>
                    {v.condicoes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {v.condicoes.map((c) => (
                          <span
                            key={c}
                            className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
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

                  {v.observacoes && (
                    <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                      {v.observacoes}
                    </p>
                  )}
                </button>
              );
            })
          )}

          {data && data.pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 rounded-md px-3 text-xs disabled:opacity-50"
                style={{
                  backgroundColor: "var(--acolhe-card)",
                  border: "1px solid var(--acolhe-border)",
                  color: "var(--acolhe-fg)",
                }}
              >
                Anterior
              </button>
              <span className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                {page} / {data.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages}
                className="h-8 rounded-md px-3 text-xs disabled:opacity-50"
                style={{
                  backgroundColor: "var(--acolhe-card)",
                  border: "1px solid var(--acolhe-border)",
                  color: "var(--acolhe-fg)",
                }}
              >
                Proxima
              </button>
            </div>
          )}
        </div>

        {showCreate && prefeituraId && (
          <NovaVisitaModal
            prefeituraId={prefeituraId}
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              void utils.visita.list.invalidate();
              void utils.visita.kpis.invalidate();
            }}
          />
        )}

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
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid var(--acolhe-border)" }}
            >
              <h2
                className="text-base font-semibold"
                style={{
                  fontFamily: "var(--font-plus-jakarta), sans-serif",
                  color: "var(--acolhe-fg)",
                }}
              >
                Detalhes da visita
              </h2>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-md p-1"
                style={{ color: "var(--acolhe-muted-fg)" }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <DrawerStatus visita={detail} />

              <Section label="Data e hora">
                <p className="text-sm font-medium" style={{ color: "var(--acolhe-fg)" }}>
                  {new Date(detail.dataPrevista).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                {detail.dataRealizada && (
                  <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                    Realizada as{" "}
                    {new Date(detail.dataRealizada).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </Section>

              <Section label="Morador">
                {detail.domicilio.moradores.length > 0 ? (
                  <ul className="space-y-1">
                    {detail.domicilio.moradores.map((m) => (
                      <li key={m.id} className="text-sm" style={{ color: "var(--acolhe-fg)" }}>
                        {m.nome}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                    Sem morador cadastrado
                  </p>
                )}
              </Section>

              <Section label="Endereco">
                <p className="text-sm" style={{ color: "var(--acolhe-fg)" }}>
                  {detail.domicilio.logradouro}, {detail.domicilio.numero}
                </p>
                <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                  {detail.domicilio.bairro}
                </p>
              </Section>

              <Section label="ACS">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: detail.acs.equipe.cor }}
                  >
                    {getInitials(detail.acs.usuario.nome)}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--acolhe-fg)" }}>
                      {detail.acs.usuario.nome}
                    </p>
                    <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                      {detail.acs.equipe.nome}
                    </p>
                  </div>
                </div>
              </Section>

              {detail.observacoes && (
                <Section label="Observacoes">
                  <p className="text-sm" style={{ color: "var(--acolhe-fg)" }}>
                    {detail.observacoes}
                  </p>
                </Section>
              )}

              {detail.motivoRecusa && (
                <Section label="Motivo da recusa">
                  <p className="text-sm" style={{ color: "var(--acolhe-fg)" }}>
                    {detail.motivoRecusa}
                  </p>
                </Section>
              )}

              {detail.latCheckin && detail.lngCheckin && (
                <Section label="Check-in GPS">
                  <p className="font-mono text-xs" style={{ color: "var(--acolhe-fg)" }}>
                    {detail.latCheckin.toFixed(5)}, {detail.lngCheckin.toFixed(5)}
                  </p>
                </Section>
              )}

              {detail.coords ? (
                <Section label="Localizacao">
                  <MapMiniature lat={detail.coords.lat} lng={detail.coords.lng} height={160} />
                </Section>
              ) : (
                <Section label="Localizacao">
                  <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                    Domicilio sem coordenadas registradas
                  </p>
                </Section>
              )}

              {/* Actions */}
              <div
                className="flex gap-2 pt-3"
                style={{ borderTop: "1px solid var(--acolhe-border)" }}
              >
                {detail.status === "PENDENTE" && (
                  <button
                    onClick={() =>
                      atualizarMutation.mutate({
                        id: detail.id,
                        status: "REALIZADA",
                        dataRealizada: new Date(),
                      })
                    }
                    disabled={atualizarMutation.isPending}
                    className="flex-1 rounded-lg py-2 text-xs font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: "var(--acolhe-success)" }}
                  >
                    Marcar realizada
                  </button>
                )}
                {detail.status !== "CANCELADA" && (
                  <button
                    onClick={() => {
                      if (confirm("Cancelar esta visita?")) {
                        cancelarMutation.mutate({ id: detail.id });
                      }
                    }}
                    disabled={cancelarMutation.isPending}
                    className="flex-1 rounded-lg py-2 text-xs font-semibold disabled:opacity-50"
                    style={{
                      border: "1px solid var(--acolhe-border)",
                      color: "var(--acolhe-fg)",
                    }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
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
      className="h-9 w-full rounded-lg px-3 text-sm outline-none lg:w-auto"
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

function KpiCard({
  label,
  value,
  color,
  highlight = false,
}: {
  label: string;
  value: number | string;
  color: string;
  bg: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="rounded-lg p-3 sm:px-5 sm:py-4"
      style={{
        backgroundColor: "var(--acolhe-card)",
        border: highlight ? `1px solid ${color}` : "1px solid var(--acolhe-border)",
        boxShadow: "var(--acolhe-shadow-sm)",
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <p
          className="truncate text-[9px] font-semibold uppercase tracking-wider sm:text-[10px]"
          style={{ color: "var(--acolhe-muted-fg)" }}
        >
          {label}
        </p>
        <span
          className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      </div>
      <p
        className="mt-1 text-lg font-bold leading-none sm:mt-2 sm:text-2xl"
        style={{
          fontFamily: "var(--font-plus-jakarta), sans-serif",
          color,
        }}
      >
        {value}
      </p>
    </div>
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

interface DrawerVisita {
  status: string;
  dataPrevista: Date | string;
  isAtrasada?: boolean;
}

function DrawerStatus({ visita }: { visita: DrawerVisita }) {
  const isAtrasada =
    visita.status === "PENDENTE" && new Date(visita.dataPrevista).getTime() < Date.now();
  const key: StatusVisita = isAtrasada ? "ATRASADA" : (visita.status as StatusVisita);
  const cfg = STATUS_CONFIG[key];

  if (isAtrasada) {
    const dias = Math.floor(
      (Date.now() - new Date(visita.dataPrevista).getTime()) / (1000 * 60 * 60 * 24),
    );
    return (
      <div className="space-y-2 rounded-lg p-3" style={{ backgroundColor: cfg.bg }}>
        <span
          className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: cfg.color, color: "#FFFFFF" }}
        >
          {cfg.label}
        </span>
        <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: cfg.color }}>
          <AlertCircle size={14} />
          Esta visita esta {dias} {dias === 1 ? "dia" : "dias"} atrasada
        </div>
      </div>
    );
  }

  return (
    <div>
      <p
        className="mb-2 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--acolhe-muted-fg)" }}
      >
        Status
      </p>
      <span
        className="inline-block rounded-full px-3 py-1 text-sm font-semibold"
        style={{ backgroundColor: cfg.bg, color: cfg.color }}
      >
        {cfg.label}
      </span>
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
        <ClipboardList size={32} style={{ color: "var(--acolhe-primary)" }} />
      </div>
      <h3
        className="text-lg font-semibold"
        style={{
          fontFamily: "var(--font-plus-jakarta), sans-serif",
          color: "var(--acolhe-fg)",
        }}
      >
        Nenhuma visita encontrada
      </h3>
      <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
        Ajuste os filtros para ampliar a busca
      </p>
    </div>
  );
}

function getInitials(name: string): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
