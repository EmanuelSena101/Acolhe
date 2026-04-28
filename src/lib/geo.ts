import { db } from "@/server/db";
import { Prisma } from "@prisma/client";

type GeoJSON = {
  type: string;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
};

const VALID_GEO_COLUMNS: Record<string, string[]> = {
  Prefeitura: ["geom"],
  UBS: ["geom"],
  Microarea: ["geom"],
  Domicilio: ["geom"],
  Visita: ["geom_checkin"],
  AgendaDia: ["rota"],
};

function validateTableColumn(table: string, column: string): void {
  const allowed = VALID_GEO_COLUMNS[table];
  if (!allowed || !allowed.includes(column)) {
    throw new Error(`Combinacao tabela/coluna invalida: ${table}.${column}`);
  }
}

export async function toGeoJSON(
  table: string,
  column: string,
  id: string,
): Promise<GeoJSON | null> {
  validateTableColumn(table, column);
  const result = await db.$queryRaw<{ geojson: string }[]>(
    Prisma.sql`SELECT ST_AsGeoJSON(${Prisma.raw(`"${column}"`)}) as geojson
               FROM ${Prisma.raw(`"${table}"`)}
               WHERE id = ${id}
               AND ${Prisma.raw(`"${column}"`)} IS NOT NULL`,
  );
  if (result.length === 0 || !result[0].geojson) return null;
  return JSON.parse(result[0].geojson) as GeoJSON;
}

export async function setGeometry(
  table: string,
  column: string,
  id: string,
  geojson: GeoJSON,
): Promise<void> {
  validateTableColumn(table, column);
  const json = JSON.stringify(geojson);
  await db.$executeRaw(
    Prisma.sql`UPDATE ${Prisma.raw(`"${table}"`)}
               SET ${Prisma.raw(`"${column}"`)} = ST_GeomFromGeoJSON(${json})
               WHERE id = ${id}`,
  );
}

export async function isWithinMunicipio(
  lat: number,
  lng: number,
  prefeituraId: string,
): Promise<boolean> {
  const result = await db.$queryRaw<{ within: boolean }[]>(
    Prisma.sql`SELECT ST_Within(
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
      geom
    ) as within
    FROM "Prefeitura"
    WHERE id = ${prefeituraId}
    AND geom IS NOT NULL`,
  );
  return result.length > 0 && result[0].within;
}

export async function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusMeters: number,
): Promise<boolean> {
  const result = await db.$queryRaw<{ within: boolean }[]>(
    Prisma.sql`SELECT ST_DWithin(
      ST_SetSRID(ST_MakePoint(${lng1}, ${lat1}), 4326)::geography,
      ST_SetSRID(ST_MakePoint(${lng2}, ${lat2}), 4326)::geography,
      ${radiusMeters}
    ) as within`,
  );
  return result.length > 0 && result[0].within;
}

export async function checkOverlap(
  geojson: GeoJSON,
  equipeId: string,
  excludeMicroareaId?: string,
): Promise<boolean> {
  const json = JSON.stringify(geojson);
  const excludeClause = excludeMicroareaId
    ? Prisma.sql`AND id != ${excludeMicroareaId}`
    : Prisma.empty;

  const result = await db.$queryRaw<{ overlaps: boolean }[]>(
    Prisma.sql`SELECT EXISTS(
      SELECT 1 FROM "Microarea"
      WHERE "equipeId" = ${equipeId}
      ${excludeClause}
      AND geom IS NOT NULL
      AND ST_Intersects(geom, ST_GeomFromGeoJSON(${json}))
    ) as overlaps`,
  );
  return result.length > 0 && result[0].overlaps;
}

export async function isValidGeometry(geojson: GeoJSON): Promise<boolean> {
  const json = JSON.stringify(geojson);
  const result = await db.$queryRaw<{ valid: boolean }[]>(
    Prisma.sql`SELECT ST_IsValid(ST_GeomFromGeoJSON(${json})) as valid`,
  );
  return result.length > 0 && result[0].valid;
}

export async function getArea(geojson: GeoJSON): Promise<number> {
  const json = JSON.stringify(geojson);
  const result = await db.$queryRaw<{ area: number }[]>(
    Prisma.sql`SELECT ST_Area(ST_GeomFromGeoJSON(${json})::geography) as area`,
  );
  return result.length > 0 ? result[0].area : 0;
}

export type GeoFeature = {
  type: "Feature";
  geometry: GeoJSON;
  properties: Record<string, unknown>;
};

export type GeoFeatureCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

export function rowsToFeatureCollection<T extends { geojson: string | null }>(
  rows: T[],
  buildProperties: (row: T) => Record<string, unknown>,
): GeoFeatureCollection {
  const features: GeoFeature[] = [];
  for (const row of rows) {
    if (!row.geojson) continue;
    let geometry: GeoJSON;
    try {
      geometry = JSON.parse(row.geojson) as GeoJSON;
    } catch {
      continue;
    }
    features.push({
      type: "Feature",
      geometry,
      properties: buildProperties(row),
    });
  }
  return { type: "FeatureCollection", features };
}

export type Bounds = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export async function getMunicipioBounds(prefeituraId: string): Promise<Bounds | null> {
  const result = await db.$queryRaw<
    { minlng: number; minlat: number; maxlng: number; maxlat: number }[]
  >(
    Prisma.sql`SELECT
      ST_XMin(ST_Envelope(geom)) AS minlng,
      ST_YMin(ST_Envelope(geom)) AS minlat,
      ST_XMax(ST_Envelope(geom)) AS maxlng,
      ST_YMax(ST_Envelope(geom)) AS maxlat
    FROM "Prefeitura"
    WHERE id = ${prefeituraId}
    AND geom IS NOT NULL`,
  );
  if (result.length === 0 || result[0].minlng === null) return null;
  return {
    minLng: result[0].minlng,
    minLat: result[0].minlat,
    maxLng: result[0].maxlng,
    maxLat: result[0].maxlat,
  };
}
