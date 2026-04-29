"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Bounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

interface MapViewProps {
  className?: string;
  center?: [number, number];
  zoom?: number;
  microareas?: GeoJSON.FeatureCollection;
  domicilios?: GeoJSON.FeatureCollection;
  ubs?: GeoJSON.FeatureCollection;
  municipio?: GeoJSON.FeatureCollection;
  bounds?: Bounds | null;
  onMicroareaClick?: (_id: string) => void;
}

const DEFAULT_CENTER: [number, number] = [-46.785, -23.21];
const DEFAULT_ZOOM = 13;

const STATUS_ICON_SVGS: Record<string, string> = {
  "em-dia-icon": `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="#0F766E" stroke="#FFFFFF" stroke-width="2.5"/><path d="M14.5 9.5h2.7c1.5 0 2.7 1 2.7 2.4v3.6h4.5c.9 0 1.6.6 1.6 1.4l-1.4 7.2c-.1.9-.9 1.6-1.9 1.6h-8.2c-.6 0-1.1-.5-1.1-1.1V11.6c0-.5.2-1 .6-1.4l1.5-1.4Zm-3.6 6.4H8c-.6 0-1.1.5-1.1 1.1v8.6c0 .6.5 1.1 1.1 1.1h2.9V15.9Z" fill="#FFFFFF"/></svg>`,
  "proximo-prazo-icon": `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="#D97706" stroke="#FFFFFF" stroke-width="2.5"/><rect x="16.4" y="9" width="3.2" height="11.5" rx="1.6" fill="#FFFFFF"/><circle cx="18" cy="25" r="1.9" fill="#FFFFFF"/></svg>`,
  "atrasado-icon": `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" fill="#BE123C" stroke="#FFFFFF" stroke-width="2.5"/><path d="M12.5 12.5l11 11M23.5 12.5l-11 11" stroke="#FFFFFF" stroke-width="2.8" stroke-linecap="round"/></svg>`,
};

async function loadStatusIcons(map: maplibregl.Map): Promise<void> {
  await Promise.all(
    Object.entries(STATUS_ICON_SVGS).map(([name, svg]) => {
      if (map.hasImage(name)) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const img = new Image(36, 36);
        img.onload = () => {
          if (!map.hasImage(name)) {
            map.addImage(name, img);
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
      });
    }),
  );
}

export function MapView({
  className = "",
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  microareas,
  domicilios,
  ubs,
  municipio,
  bounds,
  onMicroareaClick,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onMicroareaClickRef = useRef(onMicroareaClick);
  onMicroareaClickRef.current = onMicroareaClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center,
      zoom,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl(), "bottom-left");

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !microareas) return;

    const handler = () => {
      if (map.getSource("microareas")) {
        (map.getSource("microareas") as maplibregl.GeoJSONSource).setData(microareas);
      } else {
        map.addSource("microareas", {
          type: "geojson",
          data: microareas,
        });

        map.addLayer({
          id: "microareas-fill",
          type: "fill",
          source: "microareas",
          paint: {
            "fill-color": ["coalesce", ["get", "cor"], "#888888"],
            "fill-opacity": 0.18,
          },
        });

        map.addLayer({
          id: "microareas-outline",
          type: "line",
          source: "microareas",
          paint: {
            "line-color": ["coalesce", ["get", "cor"], "#888888"],
            "line-width": 2.5,
            "line-opacity": 0.9,
          },
        });

        map.addLayer({
          id: "microareas-label",
          type: "symbol",
          source: "microareas",
          layout: {
            "text-field": ["get", "codigo"],
            "text-size": 13,
            "text-font": ["Noto Sans Regular"],
            "text-letter-spacing": 0.05,
          },
          paint: {
            "text-color": "#1C1A17",
            "text-halo-color": "#F7F5F2",
            "text-halo-width": 2,
          },
        });

        map.on("click", "microareas-fill", (e) => {
          const feature = e.features?.[0];
          if (feature?.properties?.id) {
            onMicroareaClickRef.current?.(feature.properties.id as string);
          }
        });

        map.on("mouseenter", "microareas-fill", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "microareas-fill", () => {
          map.getCanvas().style.cursor = "";
        });
      }
    };

    if (map.isStyleLoaded()) {
      handler();
    } else {
      map.on("load", handler);
    }
  }, [microareas]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !domicilios) return;

    const handler = async () => {
      if (map.getSource("domicilios")) {
        (map.getSource("domicilios") as maplibregl.GeoJSONSource).setData(domicilios);
        return;
      }

      await loadStatusIcons(map);

      map.addSource("domicilios", {
        type: "geojson",
        data: domicilios,
      });

      map.addLayer({
        id: "domicilios-halo",
        type: "circle",
        source: "domicilios",
        paint: {
          "circle-radius": 14,
          "circle-color": ["coalesce", ["get", "statusColor"], "#888888"],
          "circle-opacity": 0.15,
          "circle-blur": 0.5,
        },
      });

      map.addLayer({
        id: "domicilios-icon",
        type: "symbol",
        source: "domicilios",
        layout: {
          "icon-image": [
            "match",
            ["get", "status"],
            "em_dia",
            "em-dia-icon",
            "proximo_prazo",
            "proximo-prazo-icon",
            "atrasado",
            "atrasado-icon",
            "atrasado-icon",
          ],
          "icon-size": 0.7,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      map.on("click", "domicilios-icon", (e) => {
          const feature = e.features?.[0];
          if (!feature?.properties) return;

          const props = feature.properties;
          const coords = (feature.geometry as GeoJSON.Point).coordinates;

          const container = document.createElement("div");
          container.className = "text-sm";

          const pAddr = document.createElement("p");
          pAddr.className = "font-semibold";
          pAddr.textContent = `${String(props.logradouro ?? "")}, ${String(props.numero ?? "")}`;
          container.appendChild(pAddr);

          const pBairro = document.createElement("p");
          pBairro.className = "text-gray-600";
          pBairro.textContent = String(props.bairro ?? "");
          container.appendChild(pBairro);

          const pMoradores = document.createElement("p");
          pMoradores.className = "text-gray-500";
          pMoradores.textContent = `${String(props.moradores ?? 0)} moradores`;
          container.appendChild(pMoradores);

          const pVisita = document.createElement("p");
          pVisita.className = "text-gray-500";
          pVisita.textContent = `Ultima visita: ${String(props.ultimaVisita ?? "Nunca")}`;
          container.appendChild(pVisita);

          new maplibregl.Popup({ offset: 14 })
            .setLngLat(coords as [number, number])
            .setDOMContent(container)
            .addTo(map);
        });

      map.on("mouseenter", "domicilios-icon", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "domicilios-icon", () => {
        map.getCanvas().style.cursor = "";
      });
    };

    if (map.isStyleLoaded()) {
      handler();
    } else {
      map.on("load", handler);
    }
  }, [domicilios]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !municipio) return;

    const handler = () => {
      if (map.getSource("municipio")) {
        (map.getSource("municipio") as maplibregl.GeoJSONSource).setData(municipio);
      } else {
        map.addSource("municipio", { type: "geojson", data: municipio });
        map.addLayer({
          id: "municipio-outline",
          type: "line",
          source: "municipio",
          paint: {
            "line-color": "#1B4F6B",
            "line-width": 2.5,
            "line-dasharray": [3, 2],
            "line-opacity": 0.85,
          },
        });
      }
    };

    if (map.isStyleLoaded()) handler();
    else map.on("load", handler);
  }, [municipio]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ubs) return;

    const handler = () => {
      if (map.getSource("ubs")) {
        (map.getSource("ubs") as maplibregl.GeoJSONSource).setData(ubs);
      } else {
        map.addSource("ubs", { type: "geojson", data: ubs });
        map.addLayer({
          id: "ubs-halo",
          type: "circle",
          source: "ubs",
          paint: {
            "circle-radius": 18,
            "circle-color": "#1B4F6B",
            "circle-opacity": 0.15,
            "circle-blur": 0.3,
          },
        });
        map.addLayer({
          id: "ubs-points",
          type: "circle",
          source: "ubs",
          paint: {
            "circle-radius": 11,
            "circle-color": "#1B4F6B",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#FFFFFF",
          },
        });
        map.addLayer({
          id: "ubs-cross",
          type: "symbol",
          source: "ubs",
          layout: {
            "text-field": "+",
            "text-size": 14,
            "text-font": ["Noto Sans Regular"],
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": "#FFFFFF",
          },
        });
        map.addLayer({
          id: "ubs-label",
          type: "symbol",
          source: "ubs",
          layout: {
            "text-field": ["get", "nome"],
            "text-size": 11,
            "text-font": ["Noto Sans Regular"],
            "text-offset": [0, 1.6],
            "text-anchor": "top",
          },
          paint: {
            "text-color": "#1B4F6B",
            "text-halo-color": "#F7F5F2",
            "text-halo-width": 2,
          },
        });
      }
    };

    if (map.isStyleLoaded()) handler();
    else map.on("load", handler);
  }, [ubs]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !bounds) return;

    const apply = () => {
      map.fitBounds(
        [
          [bounds.minLng, bounds.minLat],
          [bounds.maxLng, bounds.maxLat],
        ],
        { padding: 40, duration: 800 },
      );
    };

    if (map.isStyleLoaded()) apply();
    else map.on("load", apply);
  }, [bounds]);

  return <div ref={containerRef} className={`h-full w-full ${className}`} />;
}
