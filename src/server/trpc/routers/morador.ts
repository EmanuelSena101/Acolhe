import { z } from "zod";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";

export const moradorRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        domicilioId: z.string().optional(),
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = {};
      if (input.domicilioId) where.domicilioId = input.domicilioId;
      if (input.search) {
        where.nome = { contains: input.search, mode: "insensitive" };
      }

      const [items, total] = await Promise.all([
        db.morador.findMany({
          where,
          orderBy: { nome: "asc" },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            domicilio: {
              select: {
                logradouro: true,
                numero: true,
                microarea: { select: { codigo: true } },
              },
            },
          },
        }),
        db.morador.count({ where }),
      ]);

      return { items, total, pages: Math.ceil(total / input.perPage) };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.morador.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        domicilio: {
          select: {
            id: true,
            logradouro: true,
            numero: true,
            bairro: true,
            microarea: {
              select: {
                id: true,
                codigo: true,
                equipe: { select: { id: true, nome: true } },
              },
            },
          },
        },
      },
    });
  }),

  create: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "ACS"])
    .input(
      z.object({
        domicilioId: z.string(),
        cns: z.string().length(15).optional(),
        cpf: z.string().length(11).optional(),
        nome: z.string().min(2).max(200),
        nascimento: z.coerce.date(),
        sexo: z.enum(["MASCULINO", "FEMININO", "OUTRO"]),
        condicoes: z.array(z.string()).default([]),
        prioridade: z.number().int().min(0).max(3).default(0),
        vinculo: z.string().max(50).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        const morador = await tx.morador.create({
          data: {
            ...input,
            condicoes: input.condicoes,
          },
        });

        await tx.domicilio.update({
          where: { id: input.domicilioId },
          data: { nMoradores: { increment: 1 } },
        });

        return morador;
      });
    }),

  update: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "ACS"])
    .input(
      z.object({
        id: z.string(),
        cns: z.string().length(15).optional(),
        nome: z.string().min(2).max(200).optional(),
        nascimento: z.coerce.date().optional(),
        sexo: z.enum(["MASCULINO", "FEMININO", "OUTRO"]).optional(),
        condicoes: z.array(z.string()).optional(),
        prioridade: z.number().int().min(0).max(3).optional(),
        vinculo: z.string().max(50).optional(),
        ativo: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input: { id, ...data } }) => {
      return db.morador.update({ where: { id }, data });
    }),

  delete: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        const morador = await tx.morador.findUniqueOrThrow({
          where: { id: input.id },
          select: { domicilioId: true },
        });

        await tx.morador.delete({ where: { id: input.id } });

        await tx.domicilio.update({
          where: { id: morador.domicilioId },
          data: { nMoradores: { decrement: 1 } },
        });

        return { success: true };
      });
    }),
});
