import { z } from "zod";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";
import { validarPNAB } from "@/server/services/pnab-validator";

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
