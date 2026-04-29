"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Props {
  lat: number;
  lng: number;
  height?: number;
  zoom?: number;
}

export function MapMiniature({ lat, lng, height = 160, zoom = 16 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

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
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
          },
        },
        layers: [{ id: "osm-tiles", type: "raster", source: "osm" }],
      },
      center: [lng, lat],
      zoom,
      interactive: false,
      attributionControl: false,
    });

    const el = document.createElement("div");
    el.style.cssText =
      "width:20px;height:20px;border-radius:50%;background:#1B4F6B;border:3px solid #FFFFFF;box-shadow:0 2px 6px rgba(28,26,23,0.35);";

    new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, zoom]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid var(--acolhe-border)",
      }}
    />
  );
}
