import { z } from "zod";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";

export const acsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        equipeId: z.string().optional(),
        prefeituraId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return db.aCS.findMany({
        where: {
          ...(input.equipeId && { equipeId: input.equipeId }),
          ...(input.prefeituraId && {
            equipe: { ubs: { prefeituraId: input.prefeituraId } },
          }),
        },
        orderBy: { matricula: "asc" },
        include: {
          usuario: { select: { id: true, nome: true, email: true } },
          equipe: { select: { id: true, nome: true, cor: true } },
          _count: { select: { microareas: true, visitas: true } },
        },
      });
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.aCS.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
        equipe: {
          select: { id: true, nome: true, cor: true, ubs: { select: { id: true, nome: true } } },
        },
        microareas: {
          include: { _count: { select: { domicilios: true } } },
        },
      },
    });
  }),

  create: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(
      z.object({
        usuarioId: z.string(),
        equipeId: z.string(),
        matricula: z.string().min(1).max(50),
        cargaHoraria: z.number().int().min(20).max(44).default(40),
      }),
    )
    .mutation(async ({ input }) => {
      return db.aCS.create({
        data: input,
        include: {
          usuario: { select: { nome: true, email: true } },
        },
      });
    }),

  update: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(
      z.object({
        id: z.string(),
        equipeId: z.string().optional(),
        cargaHoraria: z.number().int().min(20).max(44).optional(),
        ativo: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input: { id, ...data } }) => {
      return db.aCS.update({ where: { id }, data });
    }),

  delete: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.aCS.delete({ where: { id: input.id } });
    }),
});
