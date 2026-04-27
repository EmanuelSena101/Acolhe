"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Home, Activity, AlertTriangle, Users, TrendingUp, FileText, Download } from "lucide-react";

export default function DashboardPage() {
  const { data: prefeituras } = trpc.prefeitura.list.useQuery();
  const prefeituraId = prefeituras?.[0]?.id;

  const { data: ubsList } = trpc.ubs.list.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const [selectedUbsId, setSelectedUbsId] = useState<string>("all");
  const [periodo, setPeriodo] = useState(() => {
    const now = new Date();
    return { mes: now.getMonth() + 1, ano: now.getFullYear() };
  });

  const { data: kpis } = trpc.relatorios.kpis.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId, refetchInterval: 10000 },
  );

  const { data: cobertura } = trpc.relatorios.coberturaMensal.useQuery(
    { prefeituraId: prefeituraId!, mes: periodo.mes, ano: periodo.ano },
    { enabled: !!prefeituraId },
  );

  const { data: atrasadas } = trpc.relatorios.visitasAtrasadas.useQuery(
    { ubsId: selectedUbsId === "all" ? (ubsList?.[0]?.id ?? "") : selectedUbsId },
    { enabled: !!ubsList && ubsList.length > 0 },
  );

  const { data: imports } = trpc.importacao.listarMeus.useQuery({ limit: 5 });
  const { data: exports } = trpc.exportacao.listar.useQuery({ limit: 5 });

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

  return (
    <div className="space-y-6">
      {/* Header with selectors */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Painel de Gestao</h1>
        <div className="flex items-center gap-3">
          {ubsList && ubsList.length > 0 && (
            <select
              value={selectedUbsId}
              onChange={(e) => setSelectedUbsId(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
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
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
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

      {/* Cobertura Detail Card */}
      {cobertura && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Cobertura {meses[(periodo.mes - 1) % 12]} {periodo.ano}
            </h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-sm text-gray-500">Total domicilios</p>
              <p className="text-2xl font-bold text-gray-900">{cobertura.totalDomicilios}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Visitados no mes</p>
              <p className="text-2xl font-bold text-green-600">{cobertura.visitadosNoMes}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cobertura</p>
              <p className="text-2xl font-bold text-blue-600">{cobertura.cobertura}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">ACS ativos</p>
              <p className="text-2xl font-bold text-purple-600">{cobertura.acsAtivos}</p>
            </div>
          </div>
          {/* Coverage bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Cobertura mensal</span>
              <span>{cobertura.cobertura}%</span>
            </div>
            <div className="mt-1 h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.min(cobertura.cobertura, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Visitas Atrasadas */}
      {atrasadas && atrasadas.total > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-800">
              {atrasadas.total} visitas atrasadas
            </h2>
          </div>
          <div className="mt-3 space-y-2">
            {atrasadas.visitas.slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <span className="text-red-700">
                  {v.domicilio.logradouro} {v.domicilio.numero} (MA {v.domicilio.microarea.codigo})
                </span>
                <span className="text-xs text-red-500">
                  {new Date(v.dataPrevista).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
            {atrasadas.total > 5 && (
              <p className="text-xs text-red-500">
                ... e mais {atrasadas.total - 5} visitas atrasadas
              </p>
            )}
          </div>
        </div>
      )}

      {/* Recent Import/Export Activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-gray-800">Importacoes recentes</h2>
          </div>
          <div className="mt-3 space-y-2">
            {imports?.map((job) => (
              <div key={job.id} className="flex items-center justify-between text-sm">
                <span className="truncate text-gray-700">{job.arquivoNome}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    job.status === "CONCLUIDO"
                      ? "bg-green-100 text-green-700"
                      : job.status === "ERRO"
                        ? "bg-red-100 text-red-700"
                        : job.status === "CONCLUIDO_COM_ERROS"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {job.status}
                </span>
              </div>
            ))}
            {(!imports || imports.length === 0) && (
              <p className="text-sm text-gray-400">Nenhuma importacao recente</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-green-600" />
            <h2 className="font-semibold text-gray-800">Exportacoes recentes</h2>
          </div>
          <div className="mt-3 space-y-2">
            {exports?.map((job) => (
              <div key={job.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Exportacao {job.tipo}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      job.status === "CONCLUIDO"
                        ? "bg-green-100 text-green-700"
                        : job.status === "ERRO"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {job.status}
                  </span>
                  {job.arquivoUrl && (
                    <a
                      href={job.arquivoUrl}
                      className="text-xs text-blue-600 underline hover:text-blue-800"
                    >
                      Baixar
                    </a>
                  )}
                </div>
              </div>
            ))}
            {(!exports || exports.length === 0) && (
              <p className="text-sm text-gray-400">Nenhuma exportacao recente</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        Dados atualizados automaticamente a cada 10 segundos
      </p>
    </div>
  );
}
