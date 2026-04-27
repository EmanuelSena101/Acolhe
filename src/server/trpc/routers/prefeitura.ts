import { z } from "zod";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";

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
