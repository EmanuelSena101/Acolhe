"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Area,
  AreaChart,
  type TooltipProps,
} from "recharts";

const ACOLHE = {
  primary: "#1B4F6B",
  primaryLight: "#E8F1F6",
  accent: "#D97706",
  success: "#0F766E",
  successLight: "#CCFBF1",
  warning: "#B45309",
  warningLight: "#FEF3C7",
  danger: "#9B1C1C",
  dangerLight: "#FEE2E2",
  fg: "#1C1A17",
  mutedFg: "#6B6560",
  border: "#DDD9D3",
  card: "#FFFFFF",
  bg: "#F7F5F2",
};

const TEAM_PALETTE = [
  "#1B4F6B",
  "#0F766E",
  "#D97706",
  "#7E22CE",
  "#BE123C",
  "#1D4ED8",
  "#065F46",
  "#92400E",
  "#1E3A5F",
  "#6D28D9",
  "#0369A1",
  "#B45309",
];

const STATUS_COLORS: Record<string, string> = {
  REALIZADA: "#0F766E",
  PENDENTE: "#1B4F6B",
  AUSENTE: "#D97706",
  RECUSADA: "#BE123C",
  CANCELADA: "#9CA3AF",
};

const STATUS_LABELS: Record<string, string> = {
  REALIZADA: "Realizada",
  PENDENTE: "Pendente",
  AUSENTE: "Ausente",
  RECUSADA: "Recusada",
  CANCELADA: "Cancelada",
};

const COND_COLORS: Record<string, string> = {
  HIPERTENSO: "#BE123C",
  DIABETICO: "#7E22CE",
  GESTANTE: "#0F766E",
  OUTROS: "#D97706",
  SAUDAVEL: "#1B4F6B",
};

const COND_LABELS: Record<string, string> = {
  HIPERTENSO: "Hipertensos",
  DIABETICO: "Diabéticos",
  GESTANTE: "Gestantes",
  OUTROS: "Outras condições",
  SAUDAVEL: "Sem condição crônica",
};

const DOMICILIO_STATUS_COLORS: Record<string, string> = {
  EM_DIA: "#0F766E",
  PROXIMO_PRAZO: "#D97706",
  ATRASADO: "#BE123C",
};

const DOMICILIO_STATUS_LABELS: Record<string, string> = {
  EM_DIA: "Em dia",
  PROXIMO_PRAZO: "Atenção",
  ATRASADO: "Atrasado",
};

interface ChartCardProps {
  title: string;
  description?: string;
  captureId?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, description, captureId, children }: ChartCardProps) {
  return (
    <div
      data-capture-id={captureId}
      className="rounded-xl p-5"
      style={{
        backgroundColor: ACOLHE.card,
        border: `1px solid ${ACOLHE.border}`,
        boxShadow: "0 1px 2px 0 rgb(28 26 23 / 0.06)",
      }}
    >
      <div className="mb-4">
        <h3
          className="text-sm font-semibold"
          style={{ fontFamily: "var(--font-plus-jakarta), sans-serif", color: ACOLHE.fg }}
        >
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs" style={{ color: ACOLHE.mutedFg }}>
            {description}
          </p>
        )}
      </div>
      <div className="h-[280px] w-full">{children}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: ACOLHE.card,
        border: `1px solid ${ACOLHE.border}`,
        boxShadow: "0 8px 24px rgb(28 26 23 / 0.12)",
      }}
    >
      {label && (
        <p className="mb-1 font-semibold" style={{ color: ACOLHE.fg }}>
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span style={{ color: ACOLHE.mutedFg }}>{p.name}:</span>
          <span className="font-semibold" style={{ color: ACOLHE.fg }}>
            {p.value}
            {String(p.name).toLowerCase().includes("cobertura") ? "%" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

const AXIS_STYLE = { fontSize: 11, fill: ACOLHE.mutedFg };
const GRID_STROKE = ACOLHE.border;

interface StatusVisitasChartProps {
  data: { status: string; total: number }[];
}

export function StatusVisitasChart({ data }: StatusVisitasChartProps) {
  const total = data.reduce((s, d) => s + d.total, 0);
  if (total === 0)
    return (
      <ChartCard title="Status das visitas" captureId="chart-status">
        <p className="text-sm" style={{ color: ACOLHE.mutedFg }}>
          Sem dados no periodo
        </p>
      </ChartCard>
    );

  const labeled = data.map((d) => ({ ...d, label: STATUS_LABELS[d.status] ?? d.status }));

  return (
    <ChartCard
      title="Status das visitas"
      description={`${total} visitas no periodo`}
      captureId="chart-status"
    >
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={labeled}
            dataKey="total"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={95}
            paddingAngle={2}
            stroke={ACOLHE.bg}
            strokeWidth={3}
            isAnimationActive={false}
          >
            {labeled.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? ACOLHE.mutedFg} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: ACOLHE.mutedFg }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface CondicoesChartProps {
  data: { nome: string; total: number }[];
}

export function CondicoesChart({ data }: CondicoesChartProps) {
  const total = data.reduce((s, d) => s + d.total, 0);
  if (total === 0)
    return (
      <ChartCard title="Condicoes de saude" captureId="chart-condicoes">
        <p className="text-sm" style={{ color: ACOLHE.mutedFg }}>
          Sem moradores cadastrados
        </p>
      </ChartCard>
    );
  const labeled = data.map((d) => ({ ...d, label: COND_LABELS[d.nome] ?? d.nome }));
  return (
    <ChartCard
      title="Condicoes de saude"
      description="Distribuicao entre moradores ativos"
      captureId="chart-condicoes"
    >
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={labeled}
            dataKey="total"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
            stroke={ACOLHE.bg}
            strokeWidth={3}
            isAnimationActive={false}
          >
            {labeled.map((entry) => (
              <Cell key={entry.nome} fill={COND_COLORS[entry.nome] ?? ACOLHE.mutedFg} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: ACOLHE.mutedFg }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface CoberturaPorUbsChartProps {
  data: { ubs: string; total: number; visitados: number; cobertura: number }[];
}

export function CoberturaPorUbsChart({ data }: CoberturaPorUbsChartProps) {
  if (data.length === 0)
    return (
      <ChartCard title="Cobertura por UBS" captureId="chart-cobertura-ubs">
        <p className="text-sm" style={{ color: ACOLHE.mutedFg }}>
          Sem UBS cadastrada
        </p>
      </ChartCard>
    );
  return (
    <ChartCard
      title="Cobertura por UBS"
      description="% de domicilios visitados no mes"
      captureId="chart-cobertura-ubs"
    >
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 40, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis type="number" domain={[0, 100]} unit="%" tick={AXIS_STYLE} stroke={GRID_STROKE} />
          <YAxis type="category" dataKey="ubs" width={140} tick={AXIS_STYLE} stroke={GRID_STROKE} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: ACOLHE.primaryLight }} />
          <Bar
            dataKey="cobertura"
            fill={ACOLHE.primary}
            radius={[0, 6, 6, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface CoberturaPorEquipeChartProps {
  data: { equipe: string; cor: string; total: number; visitados: number; cobertura: number }[];
}

export function CoberturaPorEquipeChart({ data }: CoberturaPorEquipeChartProps) {
  if (data.length === 0)
    return (
      <ChartCard title="Cobertura por equipe ESF" captureId="chart-cobertura-equipe">
        <p className="text-sm" style={{ color: ACOLHE.mutedFg }}>
          Sem equipes cadastradas
        </p>
      </ChartCard>
    );
  return (
    <ChartCard
      title="Cobertura por equipe ESF"
      description="% de domicilios visitados no mes, por equipe"
      captureId="chart-cobertura-equipe"
    >
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 40, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis type="number" domain={[0, 100]} unit="%" tick={AXIS_STYLE} stroke={GRID_STROKE} />
          <YAxis
            type="category"
            dataKey="equipe"
            width={140}
            tick={AXIS_STYLE}
            stroke={GRID_STROKE}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: ACOLHE.primaryLight }} />
          <Bar dataKey="cobertura" radius={[0, 6, 6, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.cor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface ProdutividadeAcsChartProps {
  data: { acs: string; realizadas: number }[];
}

export function ProdutividadeAcsChart({ data }: ProdutividadeAcsChartProps) {
  if (data.length === 0)
    return (
      <ChartCard title="Produtividade ACS" captureId="chart-produtividade">
        <p className="text-sm" style={{ color: ACOLHE.mutedFg }}>
          Sem ACS no periodo
        </p>
      </ChartCard>
    );
  const top = [...data].sort((a, b) => b.realizadas - a.realizadas).slice(0, 10);
  return (
    <ChartCard
      title="Produtividade por ACS"
      description="Visitas realizadas (top 10)"
      captureId="chart-produtividade"
    >
      <ResponsiveContainer>
        <BarChart data={top} margin={{ bottom: 60, left: 8, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis
            dataKey="acs"
            angle={-30}
            textAnchor="end"
            interval={0}
            tick={{ fontSize: 10, fill: ACOLHE.mutedFg }}
            stroke={GRID_STROKE}
          />
          <YAxis allowDecimals={false} tick={AXIS_STYLE} stroke={GRID_STROKE} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: ACOLHE.primaryLight }} />
          <Bar dataKey="realizadas" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {top.map((_, i) => (
              <Cell key={i} fill={TEAM_PALETTE[i % TEAM_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface VisitasPorDiaChartProps {
  data: { dia: string; total: number }[];
}

export function VisitasPorDiaChart({ data }: VisitasPorDiaChartProps) {
  if (data.length === 0)
    return (
      <ChartCard title="Visitas por dia" captureId="chart-visitas-dia">
        <p className="text-sm" style={{ color: ACOLHE.mutedFg }}>
          Sem visitas nos ultimos 30 dias
        </p>
      </ChartCard>
    );
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.dia).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  }));
  return (
    <ChartCard
      title="Visitas por dia"
      description="Realizadas nos ultimos 30 dias"
      captureId="chart-visitas-dia"
    >
      <ResponsiveContainer>
        <AreaChart data={formatted} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACOLHE.primary} stopOpacity={0.25} />
              <stop offset="100%" stopColor={ACOLHE.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: ACOLHE.mutedFg }}
            stroke={GRID_STROKE}
          />
          <YAxis allowDecimals={false} tick={AXIS_STYLE} stroke={GRID_STROKE} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="total"
            stroke={ACOLHE.primary}
            strokeWidth={2.5}
            fill="url(#lineGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

interface DistribuicaoStatusChartProps {
  data: { status: string; total: number }[];
}

export function DistribuicaoStatusChart({ data }: DistribuicaoStatusChartProps) {
  const total = data.reduce((s, d) => s + d.total, 0);
  if (total === 0)
    return (
      <ChartCard title="Status dos domicilios" captureId="chart-distribuicao">
        <p className="text-sm" style={{ color: ACOLHE.mutedFg }}>
          Sem domicilios cadastrados
        </p>
      </ChartCard>
    );
  const labeled = data.map((d) => ({
    ...d,
    label: DOMICILIO_STATUS_LABELS[d.status] ?? d.status,
    pct: total > 0 ? Math.round((d.total / total) * 100) : 0,
  }));
  return (
    <ChartCard
      title="Status dos domicilios"
      description={`${total} domicilios — em dia / atencao / atrasado`}
      captureId="chart-distribuicao"
    >
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={labeled}
            dataKey="total"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
            stroke={ACOLHE.bg}
            strokeWidth={3}
            isAnimationActive={false}
          >
            {labeled.map((entry) => (
              <Cell
                key={entry.status}
                fill={DOMICILIO_STATUS_COLORS[entry.status] ?? ACOLHE.mutedFg}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: ACOLHE.mutedFg }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// keep LineChart re-export for any backward import; not currently used
export { Line, LineChart };
