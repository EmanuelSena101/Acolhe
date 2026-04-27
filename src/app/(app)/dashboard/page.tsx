"use client";

import { trpc } from "@/lib/trpc";
import { Home, Activity, AlertTriangle, Users } from "lucide-react";

export default function DashboardPage() {
  const { data: prefeituras } = trpc.prefeitura.list.useQuery();
  const prefeituraId = prefeituras?.[0]?.id;

  const { data: kpis } = trpc.relatorios.kpis.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId, refetchInterval: 10000 },
  );

  const cards = [
    {
      label: "Total Domicilios",
      value: kpis?.totalDomicilios ?? "—",
      icon: Home,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Cobertura Mensal",
      value: kpis ? `${kpis.coberturaMensal}%` : "—%",
      icon: Activity,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Visitas Atrasadas",
      value: kpis?.visitasAtrasadas ?? "—",
      icon: AlertTriangle,
      color: kpis && kpis.visitasAtrasadas > 0 ? "text-red-600" : "text-gray-600",
      bg: kpis && kpis.visitasAtrasadas > 0 ? "bg-red-50" : "bg-gray-50",
    },
    {
      label: "ACS Ativos",
      value: kpis?.acsAtivos ?? "—",
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Painel de Gestao</h1>
        {prefeituras && prefeituras.length > 1 && (
          <span className="text-sm text-gray-500">{prefeituras[0]?.nome}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <div className={`rounded-lg p-2 ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              <p className={`mt-3 text-3xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Resumo</h2>
        <p className="mt-2 text-sm text-gray-500">
          Dados atualizados automaticamente a cada 10 segundos. Use o mapa em /territorio para
          visualizacao geografica.
        </p>
      </div>
    </div>
  );
}
