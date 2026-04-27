import { db } from "@/server/db";
import { Prisma } from "@prisma/client";

type GeoJSON = {
  type: string;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
};

export async function toGeoJSON(
  table: string,
  column: string,
  id: string,
): Promise<GeoJSON | null> {
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
