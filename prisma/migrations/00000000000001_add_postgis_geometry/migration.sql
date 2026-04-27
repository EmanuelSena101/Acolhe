-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry columns
ALTER TABLE "Prefeitura" ADD COLUMN IF NOT EXISTS geom geometry(MultiPolygon, 4326);
ALTER TABLE "UBS"        ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);
ALTER TABLE "Microarea"  ADD COLUMN IF NOT EXISTS geom geometry(Polygon, 4326);
ALTER TABLE "Domicilio"  ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);
ALTER TABLE "Visita"     ADD COLUMN IF NOT EXISTS geom_checkin geometry(Point, 4326);
ALTER TABLE "AgendaDia"  ADD COLUMN IF NOT EXISTS rota geometry(LineString, 4326);

-- Create spatial indexes
CREATE INDEX IF NOT EXISTS prefeitura_geom_idx ON "Prefeitura" USING GIST (geom);
CREATE INDEX IF NOT EXISTS ubs_geom_idx        ON "UBS"        USING GIST (geom);
CREATE INDEX IF NOT EXISTS microarea_geom_idx  ON "Microarea"  USING GIST (geom);
CREATE INDEX IF NOT EXISTS domicilio_geom_idx  ON "Domicilio"  USING GIST (geom);
