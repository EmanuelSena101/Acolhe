import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";
import { rowsToFeatureCollection, getMunicipioBounds } from "@/lib/geo";

export const prefeituraRouter = createTRPCRouter({
  list: protectedProcedure.query(async () => {
    return db.prefeitura.findMany({
      orderBy: { nome: "asc" },
      select: {
        id: true,
        ibgeCode: true,
        nome: true,
        uf: true,
        ativa: true,
        criadoEm: true,
        _count: { select: { ubss: true, usuarios: true } },
      },
    });
  }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.prefeitura.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        ubss: {
          include: {
            equipes: { include: { _count: { select: { acss: true, microareas: true } } } },
          },
        },
        _count: { select: { usuarios: true } },
      },
    });
  }),

  geoJSON: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      type Row = { id: string; nome: string; geojson: string | null };
      const rows = await db.$queryRaw<Row[]>(
        Prisma.sql`SELECT id, nome, ST_AsGeoJSON(geom) AS geojson
                   FROM "Prefeitura"
                   WHERE id = ${input.id}
                   AND geom IS NOT NULL`,
      );
      const fc = rowsToFeatureCollection<Row>(rows, (r) => ({ id: r.id, nome: r.nome }));
      const bounds = await getMunicipioBounds(input.id);
      return { featureCollection: fc, bounds };
    }),

  getByIbge: protectedProcedure
    .input(z.object({ ibgeCode: z.string() }))
    .query(async ({ input }) => {
      return db.prefeitura.findUnique({
        where: { ibgeCode: input.ibgeCode },
        include: {
          ubss: true,
          _count: { select: { usuarios: true } },
        },
      });
    }),

  create: rbacProcedure(["SUPERADMIN"])
    .input(
      z.object({
        ibgeCode: z.string().length(7),
        nome: z.string().min(2).max(200),
        uf: z.string().length(2),
      }),
    )
    .mutation(async ({ input }) => {
      return db.prefeitura.create({
        data: input,
      });
    }),

  update: rbacProcedure(["SUPERADMIN"])
    .input(
      z.object({
        id: z.string(),
        nome: z.string().min(2).max(200).optional(),
        ativa: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input: { id, ...data } }) => {
      return db.prefeitura.update({
        where: { id },
        data,
      });
    }),
});
