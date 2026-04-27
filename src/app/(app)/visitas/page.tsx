"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Clock, XCircle, AlertTriangle, Ban } from "lucide-react";

const STATUS_CONFIG = {
  PENDENTE: { label: "Pendente", icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
  REALIZADA: { label: "Realizada", icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
  RECUSADA: { label: "Recusada", icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  AUSENTE: { label: "Ausente", icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
  CANCELADA: { label: "Cancelada", icon: Ban, color: "text-gray-600", bg: "bg-gray-50" },
} as const;

type StatusVisita = keyof typeof STATUS_CONFIG;

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function VisitasPage() {
  const [statusFilter, setStatusFilter] = useState<StatusVisita | "">("");
  const [page, setPage] = useState(1);

  const { data } = trpc.visita.list.useQuery({
    status: statusFilter || undefined,
    page,
    perPage: 20,
  });

  const utils = trpc.useUtils();

  const cancelarMutation = trpc.visita.cancelar.useMutation({
    onSuccess: () => void utils.visita.list.invalidate(),
  });

  const atualizarMutation = trpc.visita.atualizar.useMutation({
    onSuccess: () => void utils.visita.list.invalidate(),
  });

  const handleMarkRealized = (id: string) => {
    atualizarMutation.mutate({
      id,
      status: "REALIZADA",
      dataRealizada: new Date(),
    });
  };

  const handleCancel = (id: string) => {
    if (confirm("Cancelar esta visita?")) {
      cancelarMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Visitas</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusVisita | "");
            setPage(1);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      {data && (
        <div className="flex gap-4 text-sm text-gray-600">
          <span>{data.total} visitas encontradas</span>
          <span>
            Pagina {page} de {data.pages || 1}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Data prevista
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Data realizada
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                ACS
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Domicilio
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Microarea
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.items.map((visita) => {
              const cfg = STATUS_CONFIG[visita.status as StatusVisita];
              const Icon = cfg.icon;
              return (
                <tr key={visita.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {formatDate(visita.dataPrevista)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {formatDate(visita.dataRealizada)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {visita.acs.usuario.nome}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {visita.domicilio.logradouro}, {visita.domicilio.numero}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                    {visita.domicilio.microarea?.codigo ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {visita.status === "PENDENTE" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMarkRealized(visita.id)}
                          disabled={atualizarMutation.isPending}
                          className="text-green-600 hover:text-green-800"
                          title="Marcar como realizada"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCancel(visita.id)}
                          disabled={cancelarMutation.isPending}
                          className="text-red-600 hover:text-red-800"
                          title="Cancelar"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {(!data?.items || data.items.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  Nenhuma visita encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600">
            {page} / {data.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page >= data.pages}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Proxima
          </button>
        </div>
      )}
    </div>
  );
}
