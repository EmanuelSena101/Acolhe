"use client";

import dynamic from "next/dynamic";

/**
 * Versao lazy do MapMiniature — tira o maplibre-gl do bundle inicial da tela
 * de Visitas (carrega so no client, sob demanda). Ver map-view-lazy.
 */
export const MapMiniature = dynamic(() => import("./map-miniature").then((m) => m.MapMiniature), {
  ssr: false,
  loading: () => (
    <div
      className="flex min-h-[160px] w-full items-center justify-center rounded-lg"
      style={{ backgroundColor: "var(--acolhe-muted)", color: "var(--acolhe-muted-fg)" }}
    >
      <span className="text-xs">Carregando mapa…</span>
    </div>
  ),
});
