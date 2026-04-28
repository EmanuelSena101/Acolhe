import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";
import { validarPNAB } from "@/server/services/pnab-validator";
import { rowsToFeatureCollection } from "@/lib/geo";

export const microareaRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        equipeId: z.string().optional(),
        acsId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return db.microarea.findMany({
        where: {
          ...(input.equipeId && { equipeId: input.equipeId }),
          ...(input.acsId && { acsId: input.acsId }),
        },
        orderBy: { codigo: "asc" },
        include: {
          equipe: { select: { id: true, nome: true, cor: true } },
          acs: {
            select: {
              id: true,
              usuario: { select: { nome: true } },
            },
          },
          _count: { select: { domicilios: true } },
        },
      });
    }),

  listGeoJSON: protectedProcedure
    .input(
      z.object({
        prefeituraId: z.string().optional(),
        equipeId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const equipeFilter = input.equipeId
        ? Prisma.sql`AND m."equipeId" = ${input.equipeId}`
        : Prisma.empty;
      const prefeituraFilter = input.prefeituraId
        ? Prisma.sql`AND u."prefeituraId" = ${input.prefeituraId}`
        : Prisma.empty;

      type Row = {
        id: string;
        codigo: string;
        cor: string;
        equipeNome: string;
        acsNome: string | null;
        populacaoEstimada: number;
        totalDomicilios: bigint;
        geojson: string | null;
      };
      const rows = await db.$queryRaw<Row[]>(
        Prisma.sql`
          SELECT
            m.id,
            m.codigo,
            e.cor AS cor,
            e.nome AS "equipeNome",
            usr.nome AS "acsNome",
            m."populacaoEstimada",
            (SELECT COUNT(*) FROM "Domicilio" d WHERE d."microareaId" = m.id) AS "totalDomicilios",
            ST_AsGeoJSON(m.geom) AS geojson
          FROM "Microarea" m
          JOIN "EquipeESF" e ON e.id = m."equipeId"
          JOIN "UBS" u ON u.id = e."ubsId"
          LEFT JOIN "ACS" a ON a.id = m."acsId"
          LEFT JOIN "Usuario" usr ON usr.id = a."usuarioId"
          WHERE m.geom IS NOT NULL
          ${equipeFilter}
          ${prefeituraFilter}
          ORDER BY m.codigo ASC
        `,
      );

      return rowsToFeatureCollection<Row>(rows, (r) => ({
        id: r.id,
        codigo: r.codigo,
        cor: r.cor,
        equipeNome: r.equipeNome,
        acsNome: r.acsNome,
        populacaoEstimada: r.populacaoEstimada,
        totalDomicilios: Number(r.totalDomicilios),
      }));
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.microarea.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        equipe: {
          select: {
            id: true,
            nome: true,
            cor: true,
            ubs: { select: { id: true, nome: true, prefeituraId: true } },
          },
        },
        acs: {
          select: { id: true, usuario: { select: { nome: true } } },
        },
        domicilios: {
          orderBy: { logradouro: "asc" },
          include: { _count: { select: { moradores: true, visitas: true } } },
        },
      },
    });
  }),

  create: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(
      z.object({
        equipeId: z.string(),
        codigo: z.string().min(1).max(10),
        acsId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.microarea.create({ data: input });
    }),

  update: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(
      z.object({
        id: z.string(),
        codigo: z.string().min(1).max(10).optional(),
        populacaoEstimada: z.number().int().min(0).optional(),
        validada: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input: { id, ...data } }) => {
      return db.microarea.update({ where: { id }, data });
    }),

  assignAcs: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(
      z.object({
        id: z.string(),
        acsId: z.string().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.microarea.update({
        where: { id: input.id },
        data: { acsId: input.acsId },
      });
    }),

  validate: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const microarea = await db.microarea.findUniqueOrThrow({
      where: { id: input.id },
      select: { equipeId: true },
    });
    return validarPNAB(input.id, microarea.equipeId);
  }),

  delete: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.microarea.delete({ where: { id: input.id } });
    }),
});
