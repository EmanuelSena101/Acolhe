"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Shield } from "lucide-react";

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
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-blue-700" />
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
      </div>

      <div className="flex gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Entidade</label>
          <input
            type="text"
            value={filtroEntidade}
            onChange={(e) => setFiltroEntidade(e.target.value)}
            placeholder="Ex: ImportJob, Visita"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Acao</label>
          <input
            type="text"
            value={filtroAcao}
            onChange={(e) => setFiltroAcao(e.target.value)}
            placeholder="Ex: CREATE, UPDATE"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {data && data.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 font-medium text-gray-700">Data</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Usuario</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Acao</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Entidade</th>
                  <th className="px-4 py-3 font-medium text-gray-700">ID</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(item.criadoEm).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 font-medium">{item.usuario?.nome ?? "Sistema"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                        {item.acao}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.entidade}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {item.entidadeId ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nenhum registro de audit log encontrado.</p>
        )}

        {data?.nextCursor && (
          <p className="mt-4 text-center text-sm text-gray-500">
            Mostrando primeiros {data.items.length} registros
          </p>
        )}
      </div>
    </div>
  );
}
