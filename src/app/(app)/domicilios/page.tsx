"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Home, Search } from "lucide-react";

const TIPO_LABELS: Record<string, string> = {
  CASA: "Casa",
  APARTAMENTO: "Apartamento",
  COMODO: "Comodo",
  OUTRO: "Outro",
};

export default function DomiciliosPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data } = trpc.domicilio.list.useQuery({
    search: search || undefined,
    page,
    perPage: 20,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Home className="h-7 w-7 text-blue-700" />
        <h1 className="text-2xl font-bold text-gray-900">Domicilios</h1>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por logradouro ou bairro..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm"
          />
        </div>
      </div>

      {data && (
        <div className="flex gap-4 text-sm text-gray-600">
          <span>{data.total} domicilios encontrados</span>
          <span>
            Pagina {page} de {data.pages || 1}
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Logradouro
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Numero
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Bairro
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Microarea
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Moradores
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Visitas
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Ultima Visita
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.items.map((dom) => (
              <tr key={dom.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  {dom.logradouro}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{dom.numero}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{dom.bairro}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {TIPO_LABELS[dom.tipo] ?? dom.tipo}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {dom.microarea ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="inline-block h-3 w-3 rounded"
                        style={{ backgroundColor: dom.microarea.equipe.cor }}
                      />
                      {dom.microarea.codigo}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {dom._count.moradores}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {dom._count.visitas}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                  {dom.ultimaVisita ? new Date(dom.ultimaVisita).toLocaleDateString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-4">
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
