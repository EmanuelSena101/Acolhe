"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/map/map-view-lazy";
import {
  Home,
  Activity,
  AlertTriangle,
  Users,
  TrendingUp,
  FileText,
  Download,
  Map as MapIcon,
} from "lucide-react";

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export default function DashboardPage() {
  const { data: prefeituras } = trpc.prefeitura.list.useQuery();
  const prefeituraId = prefeituras?.[0]?.id;
  const prefeituraNome = prefeituras?.[0]?.nome;

  const { data: ubsList } = trpc.ubs.list.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const [selectedUbsId, setSelectedUbsId] = useState<string>("all");
  const [selectedEquipeId, setSelectedEquipeId] = useState<string>("all");
  const [selectedMicroareaId, setSelectedMicroareaId] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState(() => {
    const now = new Date();
    return { mes: now.getMonth() + 1, ano: now.getFullYear() };
  });

  const { data: equipes } = trpc.equipe.listByPrefeitura.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const equipeFilter = selectedEquipeId === "all" ? undefined : selectedEquipeId;
  const equipeAtual = equipes?.find((e) => e.id === selectedEquipeId);
  const microareaFilter = selectedMicroareaId ?? undefined;

  const { data: kpis } = trpc.relatorios.kpis.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId, refetchInterval: 10000 },
  );

  const { data: cobertura } = trpc.relatorios.coberturaMensal.useQuery(
    { prefeituraId: prefeituraId!, mes: periodo.mes, ano: periodo.ano },
    { enabled: !!prefeituraId },
  );

  const { data: atrasadas } = trpc.relatorios.visitasAtrasadas.useQuery(
    selectedUbsId === "all" ? { prefeituraId: prefeituraId! } : { ubsId: selectedUbsId },
    { enabled: !!prefeituraId && !!ubsList && ubsList.length > 0 },
  );

  const { data: imports } = trpc.importacao.listarMeus.useQuery({ limit: 5 });
  const { data: exports } = trpc.exportacao.listar.useQuery({ limit: 5 });

  const { data: microareasFC } = trpc.microarea.listGeoJSON.useQuery(
    { prefeituraId: prefeituraId!, equipeId: equipeFilter },
    { enabled: !!prefeituraId },
  );
  const { data: domiciliosFC } = trpc.domicilio.listGeoJSON.useQuery(
    { prefeituraId: prefeituraId!, equipeId: equipeFilter, microareaId: microareaFilter },
    { enabled: !!prefeituraId, refetchInterval: 10000 },
  );

  const microareaSelecionada = useMemo(() => {
    if (!selectedMicroareaId) return null;
    const fc = microareasFC as GeoJSON.FeatureCollection | undefined;
    const feat = fc?.features.find(
      (f) => (f.properties as { id?: string } | null)?.id === selectedMicroareaId,
    );
    return feat
      ? ((feat.properties as { codigo?: string; equipeNome?: string } | null) ?? null)
      : null;
  }, [microareasFC, selectedMicroareaId]);
  const { data: ubsFC } = trpc.ubs.listGeoJSON.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );
  const { data: prefeituraGeo } = trpc.prefeitura.geoJSON.useQuery(
    { id: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const microareasGeoJSON = useMemo(
    () => (microareasFC as GeoJSON.FeatureCollection | undefined) ?? EMPTY_FC,
    [microareasFC],
  );
  const domiciliosGeoJSON = useMemo(
    () => (domiciliosFC as GeoJSON.FeatureCollection | undefined) ?? EMPTY_FC,
    [domiciliosFC],
  );
  const ubsGeoJSON = useMemo(
    () => (ubsFC as GeoJSON.FeatureCollection | undefined) ?? EMPTY_FC,
    [ubsFC],
  );
  const prefeituraGeoJSON = useMemo(
    () => (prefeituraGeo?.featureCollection as GeoJSON.FeatureCollection | undefined) ?? EMPTY_FC,
    [prefeituraGeo],
  );

  const meses = [
    "Janeiro",
    "Fevereiro",
    "Marco",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const cards: KpiCardData[] = [
    {
      label: "Total Domicilios",
      value: kpis?.totalDomicilios ?? "—",
      sub: "no territorio",
      icon: Home,
      iconColor: "var(--acolhe-primary)",
      iconBg: "var(--acolhe-primary-light)",
    },
    {
      label: "Cobertura Mensal",
      value: kpis ? `${kpis.coberturaMensal}%` : "—%",
      sub: "visitas no mes",
      icon: Activity,
      iconColor: "var(--acolhe-success)",
      iconBg: "var(--acolhe-success-light)",
    },
    {
      label: "Visitas Atrasadas",
      value: kpis?.visitasAtrasadas ?? "—",
      sub: "requerem atencao",
      icon: AlertTriangle,
      iconColor:
        kpis && kpis.visitasAtrasadas > 0 ? "var(--acolhe-warning)" : "var(--acolhe-muted-fg)",
      iconBg:
        kpis && kpis.visitasAtrasadas > 0 ? "var(--acolhe-warning-light)" : "var(--acolhe-muted)",
    },
    {
      label: "ACS Ativos",
      value: kpis?.acsAtivos ?? "—",
      sub: "em campo",
      icon: Users,
      iconColor: "var(--acolhe-primary)",
      iconBg: "var(--acolhe-primary-light)",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold leading-tight"
            style={{
              fontFamily: "var(--font-plus-jakarta), sans-serif",
              color: "var(--acolhe-fg)",
            }}
          >
            Painel de Gestao
          </h1>
          <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
            {prefeituraNome ? `${prefeituraNome} · ` : ""}
            {meses[(periodo.mes - 1) % 12]} {periodo.ano}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ubsList && ubsList.length > 0 && (
            <select
              value={selectedUbsId}
              onChange={(e) => setSelectedUbsId(e.target.value)}
              className="h-9 rounded-lg px-3 text-sm outline-none transition-colors"
              style={{
                backgroundColor: "var(--acolhe-card)",
                border: "1px solid var(--acolhe-border)",
                color: "var(--acolhe-fg)",
              }}
            >
              <option value="all">Todas as UBS</option>
              {ubsList.map((ubs) => (
                <option key={ubs.id} value={ubs.id}>
                  {ubs.nome}
                </option>
              ))}
            </select>
          )}
          <select
            value={`${periodo.ano}-${periodo.mes}`}
            onChange={(e) => {
              const [ano, mes] = e.target.value.split("-").map(Number);
              setPeriodo({ ano, mes });
            }}
            className="h-9 rounded-lg px-3 text-sm outline-none"
            style={{
              backgroundColor: "var(--acolhe-card)",
              border: "1px solid var(--acolhe-border)",
              color: "var(--acolhe-fg)",
            }}
          >
            {Array.from({ length: 6 }, (_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const m = d.getMonth() + 1;
              const a = d.getFullYear();
              return (
                <option key={`${a}-${m}`} value={`${a}-${m}`}>
                  {meses[m - 1]} {a}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </div>

      {/* Mapa de gestao */}
      <Card>
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
          style={{ borderBottom: "1px solid var(--acolhe-border)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <MapIcon size={16} style={{ color: "var(--acolhe-primary)" }} />
              <span
                className="text-sm font-semibold"
                style={{
                  fontFamily: "var(--font-plus-jakarta), sans-serif",
                  color: "var(--acolhe-fg)",
                }}
              >
                Mapa do Territorio
              </span>
            </div>
            {equipes && equipes.length > 0 && (
              <div className="flex items-center gap-2">
                {equipeAtual && (
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: equipeAtual.cor }}
                  />
                )}
                <select
                  value={selectedEquipeId}
                  onChange={(e) => setSelectedEquipeId(e.target.value)}
                  className="h-8 rounded-md px-2.5 text-xs outline-none"
                  style={{
                    backgroundColor: "var(--acolhe-card)",
                    border: "1px solid var(--acolhe-border)",
                    color: "var(--acolhe-fg)",
                  }}
                  aria-label="Filtrar por equipe"
                >
                  <option value="all">Todas as equipes</option>
                  {equipes.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.nome} · {eq.ubs.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LegendDot color="var(--acolhe-map-ok)" label="Em dia" />
            <LegendDot color="var(--acolhe-map-alert)" label="Proximo prazo" />
            <LegendDot color="var(--acolhe-map-critical)" label="Atrasado" />
            <LegendDot color="var(--acolhe-primary)" label="UBS" />
          </div>
        </div>
        {selectedMicroareaId && (
          <div
            className="flex items-center justify-between gap-3 px-5 py-2 text-xs"
            style={{
              backgroundColor: "var(--acolhe-primary-light)",
              borderBottom: "1px solid var(--acolhe-border)",
            }}
          >
            <span style={{ color: "var(--acolhe-primary)" }}>
              Mostrando apenas a microarea <strong>{microareaSelecionada?.codigo ?? ""}</strong>
              {microareaSelecionada?.equipeNome ? ` — ${microareaSelecionada.equipeNome}` : ""}
            </span>
            <button
              onClick={() => setSelectedMicroareaId(null)}
              className="font-semibold underline-offset-2 hover:underline"
              style={{ color: "var(--acolhe-primary)" }}
            >
              Limpar
            </button>
          </div>
        )}
        <div className="h-[480px] w-full">
          <MapView
            key={prefeituraId ?? "none"}
            microareas={microareasGeoJSON}
            domicilios={domiciliosGeoJSON}
            ubs={ubsGeoJSON}
            municipio={prefeituraGeoJSON}
            bounds={prefeituraGeo?.bounds ?? null}
            onMicroareaClick={(id) => setSelectedMicroareaId((curr) => (curr === id ? null : id))}
          />
        </div>
      </Card>

      {/* Cobertura Detail Card */}
      {cobertura && (
        <Card padding>
          <div className="flex items-center gap-2">
            <TrendingUp size={18} style={{ color: "var(--acolhe-success)" }} />
            <h2
              className="text-base font-semibold"
              style={{
                fontFamily: "var(--font-plus-jakarta), sans-serif",
                color: "var(--acolhe-fg)",
              }}
            >
              Cobertura {meses[(periodo.mes - 1) % 12]} {periodo.ano}
            </h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Total domicilios" value={cobertura.totalDomicilios} />
            <Metric
              label="Visitados no mes"
              value={cobertura.visitadosNoMes}
              valueColor="var(--acolhe-success)"
            />
            <Metric
              label="Cobertura"
              value={`${cobertura.cobertura}%`}
              valueColor="var(--acolhe-primary)"
            />
            <Metric label="ACS ativos" value={cobertura.acsAtivos} />
          </div>
          <div className="mt-4">
            <div
              className="flex justify-between text-xs"
              style={{ color: "var(--acolhe-muted-fg)" }}
            >
              <span>Cobertura mensal</span>
              <span>{cobertura.cobertura}%</span>
            </div>
            <div
              className="mt-1 h-2.5 overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--acolhe-muted)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(cobertura.cobertura, 100)}%`,
                  backgroundColor: "var(--acolhe-success)",
                }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Visitas Atrasadas */}
      {atrasadas && atrasadas.total > 0 && (
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--acolhe-danger-light)",
            border: "1px solid rgba(155,28,28,0.15)",
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} style={{ color: "var(--acolhe-danger)" }} />
            <h2
              className="text-base font-semibold"
              style={{
                fontFamily: "var(--font-plus-jakarta), sans-serif",
                color: "var(--acolhe-danger)",
              }}
            >
              {atrasadas.total} visitas atrasadas
            </h2>
          </div>
          <div className="mt-3 space-y-2">
            {atrasadas.visitas.slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--acolhe-fg)" }}>
                  {v.domicilio.logradouro} {v.domicilio.numero} (MA {v.domicilio.microarea.codigo})
                </span>
                <span className="text-xs" style={{ color: "var(--acolhe-danger)" }}>
                  {new Date(v.dataPrevista).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
            {atrasadas.total > 5 && (
              <p className="text-xs" style={{ color: "var(--acolhe-danger)" }}>
                ... e mais {atrasadas.total - 5} visitas atrasadas
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recent Import/Export Activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card padding>
          <div className="flex items-center gap-2">
            <FileText size={18} style={{ color: "var(--acolhe-primary)" }} />
            <h2
              className="text-sm font-semibold"
              style={{
                fontFamily: "var(--font-plus-jakarta), sans-serif",
                color: "var(--acolhe-fg)",
              }}
            >
              Importacoes recentes
            </h2>
          </div>
          <div className="mt-3 space-y-2">
            {imports?.map((job) => (
              <div key={job.id} className="flex items-center justify-between text-sm">
                <span className="truncate" style={{ color: "var(--acolhe-fg)" }}>
                  {job.arquivoNome}
                </span>
                <StatusPill status={job.status} />
              </div>
            ))}
            {(!imports || imports.length === 0) && (
              <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
                Nenhuma importacao recente
              </p>
            )}
          </div>
        </Card>

        <Card padding>
          <div className="flex items-center gap-2">
            <Download size={18} style={{ color: "var(--acolhe-success)" }} />
            <h2
              className="text-sm font-semibold"
              style={{
                fontFamily: "var(--font-plus-jakarta), sans-serif",
                color: "var(--acolhe-fg)",
              }}
            >
              Exportacoes recentes
            </h2>
          </div>
          <div className="mt-3 space-y-2">
            {exports?.map((job) => (
              <div key={job.id} className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--acolhe-fg)" }}>Exportacao {job.tipo}</span>
                <div className="flex items-center gap-2">
                  <StatusPill status={job.status} />
                  {job.arquivoUrl && (
                    <a
                      href={job.arquivoUrl}
                      className="text-xs underline-offset-2 hover:underline"
                      style={{ color: "var(--acolhe-primary)" }}
                    >
                      Baixar
                    </a>
                  )}
                </div>
              </div>
            ))}
            {(!exports || exports.length === 0) && (
              <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
                Nenhuma exportacao recente
              </p>
            )}
          </div>
        </Card>
      </div>

      <p className="text-center text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
        Dados atualizados automaticamente a cada 10 segundos
      </p>
    </div>
  );
}

interface KpiCardData {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

function KpiCard({ label, value, sub, icon: Icon, iconColor, iconBg }: KpiCardData) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: "var(--acolhe-card)",
        border: "1px solid var(--acolhe-border)",
        boxShadow: "var(--acolhe-shadow-sm)",
      }}
    >
      <div className="flex items-start justify-between">
        <p
          className="text-xs font-medium leading-tight"
          style={{ color: "var(--acolhe-muted-fg)" }}
        >
          {label}
        </p>
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={16} style={{ color: iconColor }} />
        </div>
      </div>
      <p
        className="mt-3 text-2xl font-bold leading-none"
        style={{
          fontFamily: "var(--font-plus-jakarta), sans-serif",
          color: "var(--acolhe-fg)",
        }}
      >
        {value}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
        {sub}
      </p>
    </div>
  );
}

function Card({ children, padding = false }: { children: React.ReactNode; padding?: boolean }) {
  return (
    <div
      className={`overflow-hidden rounded-xl ${padding ? "p-5" : ""}`}
      style={{
        backgroundColor: "var(--acolhe-card)",
        border: "1px solid var(--acolhe-border)",
        boxShadow: "var(--acolhe-shadow-sm)",
      }}
    >
      {children}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function Metric({
  label,
  value,
  valueColor = "var(--acolhe-fg)",
}: {
  label: string;
  value: number | string;
  valueColor?: string;
}) {
  return (
    <div>
      <p className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
        {label}
      </p>
      <p
        className="mt-0.5 text-2xl font-bold"
        style={{
          fontFamily: "var(--font-plus-jakarta), sans-serif",
          color: valueColor,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    CONCLUIDO: { bg: "var(--acolhe-success-light)", fg: "var(--acolhe-success)" },
    ERRO: { bg: "var(--acolhe-danger-light)", fg: "var(--acolhe-danger)" },
    CONCLUIDO_COM_ERROS: { bg: "var(--acolhe-warning-light)", fg: "var(--acolhe-warning)" },
  };
  const c = map[status] ?? { bg: "var(--acolhe-muted)", fg: "var(--acolhe-muted-fg)" };
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
      {status}
    </span>
  );
}
