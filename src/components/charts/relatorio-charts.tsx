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
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  REALIZADA: "#2ECC71",
  PENDENTE: "#3498DB",
  AUSENTE: "#F39C12",
  RECUSADA: "#E74C3C",
  CANCELADA: "#95A5A6",
};

const COND_COLORS: Record<string, string> = {
  HIPERTENSO: "#E74C3C",
  DIABETICO: "#F39C12",
  GESTANTE: "#9B59B6",
  SAUDAVEL: "#2ECC71",
};

const COND_LABELS: Record<string, string> = {
  HIPERTENSO: "Hipertensos",
  DIABETICO: "Diabéticos",
  GESTANTE: "Gestantes",
  SAUDAVEL: "Sem condição crônica",
};

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
      </div>
      <div className="h-[260px] w-full">{children}</div>
    </div>
  );
}

interface StatusVisitasChartProps {
  data: { status: string; total: number }[];
}

export function StatusVisitasChart({ data }: StatusVisitasChartProps) {
  const total = data.reduce((s, d) => s + d.total, 0);
  if (total === 0) return <ChartCard title="Status das visitas">Sem dados no periodo</ChartCard>;
  return (
    <ChartCard title="Status das visitas" description={`${total} visitas no periodo`}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="status"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={(entry: { status: string; total: number }) =>
              `${entry.status} (${entry.total})`
            }
          >
            {data.map((entry) => (
              <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#888"} />
            ))}
          </Pie>
          <Tooltip />
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
  if (total === 0) return <ChartCard title="Condicoes de saude">Sem moradores cadastrados</ChartCard>;
  const labeled = data.map((d) => ({ ...d, label: COND_LABELS[d.nome] ?? d.nome }));
  return (
    <ChartCard title="Condicoes de saude" description="Distribuicao entre moradores ativos">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={labeled}
            dataKey="total"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={90}
          >
            {labeled.map((entry) => (
              <Cell key={entry.nome} fill={COND_COLORS[entry.nome] ?? "#888"} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
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
    return <ChartCard title="Cobertura por UBS">Sem UBS cadastrada</ChartCard>;
  return (
    <ChartCard title="Cobertura por UBS" description="% de domicilios visitados no mes">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 40, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} unit="%" />
          <YAxis type="category" dataKey="ubs" width={140} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => `${v}%`} />
          <Bar dataKey="cobertura" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
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
    return <ChartCard title="Produtividade ACS">Sem ACS no periodo</ChartCard>;
  const top = [...data].sort((a, b) => b.realizadas - a.realizadas).slice(0, 10);
  return (
    <ChartCard title="Produtividade por ACS" description="Visitas realizadas (top 10)">
      <ResponsiveContainer>
        <BarChart data={top} margin={{ bottom: 60, left: 8, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="acs"
            angle={-30}
            textAnchor="end"
            interval={0}
            tick={{ fontSize: 10 }}
          />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="realizadas" fill="#7c3aed" radius={[4, 4, 0, 0]} />
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
    return <ChartCard title="Visitas por dia">Sem visitas nos ultimos 30 dias</ChartCard>;
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.dia).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  }));
  return (
    <ChartCard title="Visitas por dia" description="Realizadas nos ultimos 30 dias">
      <ResponsiveContainer>
        <LineChart data={formatted} margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#059669"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
