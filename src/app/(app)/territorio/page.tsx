"use client";

import { useMemo, useState } from "react";
import { MapView } from "@/components/map/map-view";
import { trpc } from "@/lib/trpc";
import { X } from "lucide-react";

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

const STATUS_COLORS = {
  em_dia: "#2ECC71",
  proximo_prazo: "#F39C12",
  atrasado: "#E74C3C",
} as const;

export default function TerritorioPage() {
  const [selectedPrefeituraId, setSelectedPrefeituraId] = useState<string | null>(null);
  const [selectedMicroareaId, setSelectedMicroareaId] = useState<string | null>(null);

  const { data: prefeituras } = trpc.prefeitura.list.useQuery();

  const prefeituraId = selectedPrefeituraId ?? prefeituras?.[0]?.id ?? null;

  const { data: ubsList } = trpc.ubs.list.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const { data: equipes } = trpc.equipe.list.useQuery(
    { ubsId: ubsList?.[0]?.id ?? "" },
    { enabled: !!ubsList?.length },
  );

  const { data: microareas } = trpc.microarea.list.useQuery(
    { equipeId: undefined },
    { enabled: !!prefeituraId },
  );

  const { data: selectedMicroarea } = trpc.microarea.getById.useQuery(
    { id: selectedMicroareaId! },
    { enabled: !!selectedMicroareaId },
  );

  const { data: microareasFC } = trpc.microarea.listGeoJSON.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const { data: domiciliosFC } = trpc.domicilio.listGeoJSON.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId, refetchInterval: 10000 },
  );

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
    () =>
      (prefeituraGeo?.featureCollection as GeoJSON.FeatureCollection | undefined) ?? EMPTY_FC,
    [prefeituraGeo],
  );
  const bounds = prefeituraGeo?.bounds ?? null;

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-4 lg:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Territorio</h1>

        {prefeituras && prefeituras.length > 1 && (
          <select
            value={prefeituraId ?? ""}
            onChange={(e) => setSelectedPrefeituraId(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            {prefeituras.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        )}

        {/* Legend */}
        <div className="ml-auto flex items-center gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: STATUS_COLORS.em_dia }}
            />
            Em dia
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: STATUS_COLORS.proximo_prazo }}
            />
            Proximo prazo
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: STATUS_COLORS.atrasado }}
            />
            Atrasado
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Map */}
        <div className="relative flex-1 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <MapView
            microareas={microareasGeoJSON}
            domicilios={domiciliosGeoJSON}
            ubs={ubsGeoJSON}
            municipio={prefeituraGeoJSON}
            bounds={bounds}
            onMicroareaClick={(id) => setSelectedMicroareaId(id)}
          />
        </div>

        {/* Sidebar */}
        <div className="hidden w-80 flex-col gap-3 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:flex">
          <h2 className="text-sm font-semibold text-gray-700">Equipes</h2>

          {equipes?.map((equipe) => (
            <div
              key={equipe.id}
              className="flex items-center gap-2 rounded-md p-2 hover:bg-gray-50"
            >
              <span
                className="inline-block h-4 w-4 rounded"
                style={{ backgroundColor: equipe.cor }}
              />
              <span className="flex-1 text-sm font-medium text-gray-800">{equipe.nome}</span>
              <span className="text-xs text-gray-500">
                {equipe._count.microareas} micro · {equipe._count.acss} ACS
              </span>
            </div>
          ))}

          {microareas && microareas.length > 0 && (
            <>
              <h2 className="mt-4 text-sm font-semibold text-gray-700">Microareas</h2>
              {microareas.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMicroareaId(m.id)}
                  className={`flex items-center gap-2 rounded-md p-2 text-left hover:bg-gray-50 ${
                    selectedMicroareaId === m.id ? "bg-blue-50 ring-1 ring-blue-200" : ""
                  }`}
                >
                  <span
                    className="inline-block h-3 w-3 rounded"
                    style={{ backgroundColor: m.equipe.cor }}
                  />
                  <span className="flex-1 text-sm text-gray-800">
                    {m.codigo} — {m.equipe.nome}
                  </span>
                  <span className="text-xs text-gray-500">{m._count.domicilios} dom.</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Microarea detail drawer */}
      {selectedMicroarea && (
        <div className="fixed inset-y-0 right-0 z-50 w-96 overflow-y-auto bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="text-lg font-semibold">Microarea {selectedMicroarea.codigo}</h3>
            <button
              onClick={() => setSelectedMicroareaId(null)}
              className="rounded-md p-1 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <p className="text-sm text-gray-500">Equipe</p>
              <p className="font-medium">{selectedMicroarea.equipe.nome}</p>
            </div>

            {selectedMicroarea.acs && (
              <div>
                <p className="text-sm text-gray-500">ACS</p>
                <p className="font-medium">{selectedMicroarea.acs.usuario.nome}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-500">Populacao estimada</p>
              <p className="font-medium">{selectedMicroarea.populacaoEstimada}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Domicilios</p>
              <p className="font-medium">{selectedMicroarea.domicilios.length}</p>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-gray-700">Lista de domicilios</h4>
              <ul className="space-y-1">
                {selectedMicroarea.domicilios.slice(0, 20).map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-gray-50"
                  >
                    <span>
                      {d.logradouro}, {d.numero}
                    </span>
                    <span className="text-xs text-gray-500">{d._count.moradores} mor.</span>
                  </li>
                ))}
                {selectedMicroarea.domicilios.length > 20 && (
                  <li className="px-2 py-1 text-xs text-gray-400">
                    ... e mais {selectedMicroarea.domicilios.length - 20}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
