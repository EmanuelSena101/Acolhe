import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";
import { rowsToFeatureCollection } from "@/lib/geo";

export const ubsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ prefeituraId: z.string() }))
    .query(async ({ input }) => {
      return db.uBS.findMany({
        where: { prefeituraId: input.prefeituraId },
        orderBy: { nome: "asc" },
        include: {
          _count: { select: { equipes: true } },
        },
      });
    }),

  listGeoJSON: protectedProcedure
    .input(z.object({ prefeituraId: z.string() }))
    .query(async ({ input }) => {
      type Row = { id: string; nome: string; cnes: string; geojson: string | null };
      const rows = await db.$queryRaw<Row[]>(
        Prisma.sql`SELECT id, nome, cnes, ST_AsGeoJSON(geom) AS geojson
                   FROM "UBS"
                   WHERE "prefeituraId" = ${input.prefeituraId}
                   AND geom IS NOT NULL`,
      );
      return rowsToFeatureCollection<Row>(rows, (r) => ({
        id: r.id,
        nome: r.nome,
        cnes: r.cnes,
      }));
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.uBS.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        prefeitura: { select: { id: true, nome: true } },
        equipes: {
          include: {
            _count: { select: { acss: true, microareas: true } },
          },
        },
      },
    });
  }),

  create: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL"])
    .input(
      z.object({
        prefeituraId: z.string(),
        cnes: z.string().min(1).max(20),
        nome: z.string().min(2).max(200),
        endereco: z.string().min(2).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (
        ctx.session.user.papel === "COORD_MUNICIPAL" &&
        input.prefeituraId !== ctx.session.user.prefeituraId
      ) {
        throw new Error("Voce so pode criar UBS na sua prefeitura.");
      }
      return db.uBS.create({ data: input });
    }),

  update: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL"])
    .input(
      z.object({
        id: z.string(),
        nome: z.string().min(2).max(200).optional(),
        endereco: z.string().min(2).max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input: { id, ...data } }) => {
      if (ctx.session.user.papel === "COORD_MUNICIPAL") {
        const ubs = await db.uBS.findUniqueOrThrow({
          where: { id },
          select: { prefeituraId: true },
        });
        if (ubs.prefeituraId !== ctx.session.user.prefeituraId) {
          throw new Error("Voce so pode atualizar UBS na sua prefeitura.");
        }
      }
      return db.uBS.update({ where: { id }, data });
    }),

  delete: rbacProcedure(["SUPERADMIN"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.uBS.delete({ where: { id: input.id } });
    }),
});
