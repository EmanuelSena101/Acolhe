"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapViewProps {
  className?: string;
  center?: [number, number];
  zoom?: number;
  microareas?: GeoJSON.FeatureCollection;
  domicilios?: GeoJSON.FeatureCollection;
  onMicroareaClick?: (_id: string) => void;
}

const DEFAULT_CENTER: [number, number] = [-46.785, -23.21];
const DEFAULT_ZOOM = 13;

export function MapView({
  className = "",
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  microareas,
  domicilios,
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
            "fill-opacity": 0.25,
          },
        });

        map.addLayer({
          id: "microareas-outline",
          type: "line",
          source: "microareas",
          paint: {
            "line-color": ["coalesce", ["get", "cor"], "#888888"],
            "line-width": 2,
          },
        });

        map.addLayer({
          id: "microareas-label",
          type: "symbol",
          source: "microareas",
          layout: {
            "text-field": ["get", "codigo"],
            "text-size": 14,
            "text-font": ["Open Sans Regular"],
          },
          paint: {
            "text-color": "#333333",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.5,
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

    const handler = () => {
      if (map.getSource("domicilios")) {
        (map.getSource("domicilios") as maplibregl.GeoJSONSource).setData(domicilios);
      } else {
        map.addSource("domicilios", {
          type: "geojson",
          data: domicilios,
        });

        map.addLayer({
          id: "domicilios-points",
          type: "circle",
          source: "domicilios",
          paint: {
            "circle-radius": 5,
            "circle-color": ["coalesce", ["get", "statusColor"], "#888888"],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
          },
        });

        map.on("click", "domicilios-points", (e) => {
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

          new maplibregl.Popup({ offset: 10 })
            .setLngLat(coords as [number, number])
            .setDOMContent(container)
            .addTo(map);
        });

        map.on("mouseenter", "domicilios-points", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "domicilios-points", () => {
          map.getCanvas().style.cursor = "";
        });
      }
    };

    if (map.isStyleLoaded()) {
      handler();
    } else {
      map.on("load", handler);
    }
  }, [domicilios]);

  return <div ref={containerRef} className={`h-full w-full ${className}`} />;
}
