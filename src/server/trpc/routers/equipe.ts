import { z } from "zod";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";

export const equipeRouter = createTRPCRouter({
  list: protectedProcedure.input(z.object({ ubsId: z.string() })).query(async ({ input }) => {
    return db.equipeESF.findMany({
      where: { ubsId: input.ubsId },
      orderBy: { nome: "asc" },
      include: {
        _count: { select: { acss: true, microareas: true } },
      },
    });
  }),

  listByPrefeitura: protectedProcedure
    .input(z.object({ prefeituraId: z.string() }))
    .query(async ({ input }) => {
      return db.equipeESF.findMany({
        where: { ubs: { prefeituraId: input.prefeituraId }, ativa: true },
        orderBy: [{ ubs: { nome: "asc" } }, { nome: "asc" }],
        select: {
          id: true,
          nome: true,
          cor: true,
          ine: true,
          ubs: { select: { id: true, nome: true } },
        },
      });
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.equipeESF.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        ubs: { select: { id: true, nome: true, prefeituraId: true } },
        acss: {
          include: {
            usuario: { select: { id: true, nome: true, email: true } },
          },
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
        ubsId: z.string(),
        ine: z.string().min(1).max(20),
        nome: z.string().min(2).max(200),
        cor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      }),
    )
    .mutation(async ({ input }) => {
      return db.equipeESF.create({ data: input });
    }),

  update: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(
      z.object({
        id: z.string(),
        nome: z.string().min(2).max(200).optional(),
        cor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        ativa: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input: { id, ...data } }) => {
      return db.equipeESF.update({ where: { id }, data });
    }),

  delete: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.equipeESF.delete({ where: { id: input.id } });
    }),
});
