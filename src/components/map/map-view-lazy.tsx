"use client";

import dynamic from "next/dynamic";

/**
 * Versao lazy do MapView: o maplibre-gl (~200kB) sai do bundle inicial da
 * pagina e carrega em um chunk separado, so no client (ssr:false). Assim o
 * shell da pagina + sidebar hidratam rapido — evitando a janela em que o
 * primeiro clique num link de navegacao era "engolido" (race de hidratacao).
 */
export const MapView = dynamic(() => import("./map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full min-h-[300px] w-full items-center justify-center rounded-xl"
      style={{ backgroundColor: "var(--acolhe-muted)", color: "var(--acolhe-muted-fg)" }}
    >
      <span className="text-sm">Carregando mapa…</span>
    </div>
  ),
});
