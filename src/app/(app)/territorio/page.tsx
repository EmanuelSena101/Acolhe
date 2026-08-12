"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MapView } from "@/components/map/map-view-lazy";
import { trpc } from "@/lib/trpc";
import { X, Map as MapIcon, Users } from "lucide-react";

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

export default function TerritorioPage() {
  const searchParams = useSearchParams();
  const [selectedPrefeituraId, setSelectedPrefeituraId] = useState<string | null>(null);
  const [selectedEquipeId, setSelectedEquipeId] = useState<string>("all");
  const [selectedMicroareaId, setSelectedMicroareaId] = useState<string | null>(() =>
    searchParams.get("microareaId"),
  );

  useEffect(() => {
    const fromUrl = searchParams.get("microareaId");
    if (fromUrl) {
      setSelectedMicroareaId(fromUrl);
      setSelectedEquipeId("all");
    }
  }, [searchParams]);

  const { data: prefeituras } = trpc.prefeitura.list.useQuery();
  const prefeituraId = selectedPrefeituraId ?? prefeituras?.[0]?.id ?? null;

  const { data: equipes } = trpc.equipe.listByPrefeitura.useQuery(
    { prefeituraId: prefeituraId! },
    { enabled: !!prefeituraId },
  );

  const { data: microareas } = trpc.microarea.list.useQuery(
    { equipeId: undefined },
    { enabled: !!prefeituraId },
  );

  const { data: selectedMicroarea } = trpc.microarea.getById.useQuery(
    { id: selectedMicroareaId! },
    { enabled: !!selectedMicroareaId },
  );

  const equipeFilter = selectedEquipeId === "all" ? undefined : selectedEquipeId;
  const equipeAtual = equipes?.find((e) => e.id === selectedEquipeId);
  const microareaFilter = selectedMicroareaId ?? undefined;

  const { data: microareasFC } = trpc.microarea.listGeoJSON.useQuery(
    { prefeituraId: prefeituraId!, equipeId: equipeFilter },
    { enabled: !!prefeituraId },
  );

  const { data: domiciliosFC } = trpc.domicilio.listGeoJSON.useQuery(
    {
      prefeituraId: prefeituraId!,
      equipeId: equipeFilter,
      microareaId: microareaFilter,
    },
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
    () => (prefeituraGeo?.featureCollection as GeoJSON.FeatureCollection | undefined) ?? EMPTY_FC,
    [prefeituraGeo],
  );
  const bounds = prefeituraGeo?.bounds ?? null;

  const microareasFiltradas = useMemo(() => {
    if (!microareas) return [];
    if (!equipeFilter) return microareas;
    return microareas.filter((m) => m.equipeId === equipeFilter);
  }, [microareas, equipeFilter]);

  return (
    <div
      className="flex h-[calc(100vh-2rem)] flex-col gap-4 lg:h-[calc(100vh-4rem)]"
      style={{ color: "var(--acolhe-fg)" }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--acolhe-primary-light)" }}
          >
            <MapIcon size={20} style={{ color: "var(--acolhe-primary)" }} />
          </div>
          <div>
            <h1
              className="text-2xl font-bold leading-tight"
              style={{
                fontFamily: "var(--font-plus-jakarta), sans-serif",
                color: "var(--acolhe-fg)",
              }}
            >
              Territorio
            </h1>
            <p className="text-sm" style={{ color: "var(--acolhe-muted-fg)" }}>
              Microareas, equipes e domicilios
            </p>
          </div>
        </div>

        {prefeituras && prefeituras.length > 1 && (
          <select
            value={prefeituraId ?? ""}
            onChange={(e) => {
              setSelectedPrefeituraId(e.target.value);
              setSelectedMicroareaId(null);
              setSelectedEquipeId("all");
            }}
            className="h-9 rounded-lg px-3 text-sm outline-none"
            style={{
              backgroundColor: "var(--acolhe-card)",
              border: "1px solid var(--acolhe-border)",
              color: "var(--acolhe-fg)",
            }}
          >
            {prefeituras.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        )}

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
              onChange={(e) => {
                setSelectedEquipeId(e.target.value);
                setSelectedMicroareaId(null);
              }}
              className="h-9 rounded-lg px-3 text-sm outline-none"
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

        {/* Legend */}
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
          <LegendDot color="var(--acolhe-map-ok)" label="Em dia" />
          <LegendDot color="var(--acolhe-map-alert)" label="Proximo prazo" />
          <LegendDot color="var(--acolhe-map-critical)" label="Atrasado" />
          <LegendDot color="var(--acolhe-primary)" label="UBS" />
        </div>
      </div>

      {/* Filter chip */}
      {selectedMicroareaId && (
        <div
          className="flex items-center justify-between gap-3 rounded-lg px-4 py-2 text-xs"
          style={{
            backgroundColor: "var(--acolhe-primary-light)",
            border: "1px solid var(--acolhe-primary)",
          }}
        >
          <span style={{ color: "var(--acolhe-primary)" }}>
            Mostrando apenas a microarea selecionada — clique nela novamente para limpar
          </span>
          <button
            onClick={() => setSelectedMicroareaId(null)}
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: "var(--acolhe-primary)" }}
          >
            Limpar filtro
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Map */}
        <div
          className="relative flex-1 overflow-hidden rounded-xl"
          style={{
            border: "1px solid var(--acolhe-border)",
            boxShadow: "var(--acolhe-shadow-sm)",
          }}
        >
          <MapView
            key={prefeituraId ?? "none"}
            microareas={microareasGeoJSON}
            domicilios={domiciliosGeoJSON}
            ubs={ubsGeoJSON}
            municipio={prefeituraGeoJSON}
            bounds={bounds}
            onMicroareaClick={(id) => setSelectedMicroareaId((curr) => (curr === id ? null : id))}
          />
        </div>

        {/* Sidebar */}
        <div
          className="hidden w-80 flex-col gap-3 overflow-y-auto rounded-xl p-4 lg:flex"
          style={{
            backgroundColor: "var(--acolhe-card)",
            border: "1px solid var(--acolhe-border)",
            boxShadow: "var(--acolhe-shadow-sm)",
          }}
        >
          {!equipeFilter && equipes && equipes.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <Users size={14} style={{ color: "var(--acolhe-primary)" }} />
                <h2
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--acolhe-muted-fg)" }}
                >
                  Equipes
                </h2>
              </div>

              {equipes.map((equipe) => (
                <button
                  key={equipe.id}
                  onClick={() => {
                    setSelectedEquipeId(equipe.id);
                    setSelectedMicroareaId(null);
                  }}
                  className="flex items-center gap-2 rounded-md p-2 text-left transition-colors"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--acolhe-muted)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span
                    className="inline-block h-4 w-4 rounded"
                    style={{ backgroundColor: equipe.cor }}
                  />
                  <span
                    className="flex-1 text-sm font-medium"
                    style={{ color: "var(--acolhe-fg)" }}
                  >
                    {equipe.nome}
                  </span>
                  <span className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                    {equipe.ubs.nome}
                  </span>
                </button>
              ))}
            </>
          )}

          {microareasFiltradas.length > 0 && (
            <>
              <div className="mt-2 flex items-center gap-2">
                <MapIcon size={14} style={{ color: "var(--acolhe-primary)" }} />
                <h2
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--acolhe-muted-fg)" }}
                >
                  Microareas
                  {equipeAtual && ` · ${equipeAtual.nome}`}
                </h2>
              </div>
              {microareasFiltradas.map((m) => {
                const isSelected = selectedMicroareaId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMicroareaId(isSelected ? null : m.id)}
                    className="flex items-center gap-2 rounded-md p-2 text-left transition-colors"
                    style={{
                      backgroundColor: isSelected ? "var(--acolhe-primary-light)" : "transparent",
                      border: `1px solid ${isSelected ? "var(--acolhe-primary)" : "transparent"}`,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "var(--acolhe-muted)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{ backgroundColor: m.equipe.cor }}
                    />
                    <span
                      className="flex-1 text-sm"
                      style={{
                        color: isSelected ? "var(--acolhe-primary)" : "var(--acolhe-fg)",
                        fontWeight: isSelected ? 600 : 400,
                      }}
                    >
                      {m.codigo} — {m.equipe.nome}
                    </span>
                    <span className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                      {m._count.domicilios} dom.
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Microarea detail drawer */}
      {selectedMicroarea && (
        <div
          className="fixed inset-0 z-50 w-full overflow-y-auto lg:inset-y-0 lg:left-auto lg:right-0 lg:w-96"
          style={{
            backgroundColor: "var(--acolhe-card)",
            boxShadow: "0 -8px 32px rgba(28,26,23,0.15)",
            borderLeft: "1px solid var(--acolhe-border)",
          }}
        >
          <div
            className="flex items-center justify-between p-4"
            style={{ borderBottom: "1px solid var(--acolhe-border)" }}
          >
            <h3
              className="text-lg font-semibold"
              style={{
                fontFamily: "var(--font-plus-jakarta), sans-serif",
                color: "var(--acolhe-fg)",
              }}
            >
              Microarea {selectedMicroarea.codigo}
            </h3>
            <button
              onClick={() => setSelectedMicroareaId(null)}
              className="rounded-md p-1 transition-colors"
              style={{ color: "var(--acolhe-muted-fg)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--acolhe-muted)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 p-4">
            <DrawerField label="Equipe" value={selectedMicroarea.equipe.nome} />
            {selectedMicroarea.acs && (
              <DrawerField label="ACS" value={selectedMicroarea.acs.usuario.nome} />
            )}
            <DrawerField
              label="Populacao estimada"
              value={String(selectedMicroarea.populacaoEstimada)}
            />
            <DrawerField label="Domicilios" value={String(selectedMicroarea.domicilios.length)} />

            <div>
              <h4
                className="mb-2 text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--acolhe-muted-fg)" }}
              >
                Lista de domicilios
              </h4>
              <ul className="space-y-1">
                {selectedMicroarea.domicilios.slice(0, 20).map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between rounded px-2 py-1 text-sm transition-colors"
                    style={{ color: "var(--acolhe-fg)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--acolhe-muted)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <span>
                      {d.logradouro}, {d.numero}
                    </span>
                    <span className="text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
                      {d._count.moradores} mor.
                    </span>
                  </li>
                ))}
                {selectedMicroarea.domicilios.length > 20 && (
                  <li className="px-2 py-1 text-xs" style={{ color: "var(--acolhe-muted-fg)" }}>
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5" style={{ color: "var(--acolhe-muted-fg)" }}>
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function DrawerField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--acolhe-muted-fg)" }}
      >
        {label}
      </p>
      <p className="mt-0.5 font-medium" style={{ color: "var(--acolhe-fg)" }}>
        {value}
      </p>
    </div>
  );
}
