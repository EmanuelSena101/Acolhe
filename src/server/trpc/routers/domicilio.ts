import { z } from "zod";
import { type Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";

export const domicilioRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        microareaId: z.string().optional(),
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = {};
      if (input.microareaId) where.microareaId = input.microareaId;
      if (input.search) {
        where.OR = [
          { logradouro: { contains: input.search, mode: "insensitive" } },
          { bairro: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        db.domicilio.findMany({
          where,
          orderBy: [{ logradouro: "asc" }, { numero: "asc" }],
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            microarea: {
              select: {
                codigo: true,
                equipe: { select: { nome: true, cor: true } },
              },
            },
            _count: { select: { moradores: true, visitas: true } },
          },
        }),
        db.domicilio.count({ where }),
      ]);

      return { items, total, pages: Math.ceil(total / input.perPage) };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.domicilio.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        microarea: {
          select: {
            id: true,
            codigo: true,
            equipe: {
              select: {
                id: true,
                nome: true,
                cor: true,
                ubs: { select: { id: true, nome: true } },
              },
            },
          },
        },
        moradores: { orderBy: { nome: "asc" } },
        visitas: {
          orderBy: { dataPrevista: "desc" },
          take: 10,
          include: {
            acs: { select: { usuario: { select: { nome: true } } } },
          },
        },
      },
    });
  }),

  create: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "ACS"])
    .input(
      z.object({
        microareaId: z.string(),
        cep: z.string().length(8).optional(),
        logradouro: z.string().min(2).max(300),
        numero: z.string().min(1).max(20),
        complemento: z.string().max(100).optional(),
        bairro: z.string().min(2).max(200),
        tipo: z.enum(["CASA", "APARTAMENTO", "COMODO", "OUTRO"]).default("CASA"),
      }),
    )
    .mutation(async ({ input }) => {
      return db.domicilio.create({ data: input });
    }),

  update: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "ACS"])
    .input(
      z.object({
        id: z.string(),
        cep: z.string().length(8).optional(),
        logradouro: z.string().min(2).max(300).optional(),
        numero: z.string().min(1).max(20).optional(),
        complemento: z.string().max(100).optional(),
        bairro: z.string().min(2).max(200).optional(),
        tipo: z.enum(["CASA", "APARTAMENTO", "COMODO", "OUTRO"]).optional(),
        condicoesMoradia: z.record(z.unknown()).optional(),
        fotoUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ input: { id, condicoesMoradia, ...rest } }) => {
      const data: Prisma.DomicilioUpdateInput = { ...rest };
      if (condicoesMoradia !== undefined) {
        data.condicoesMoradia = condicoesMoradia as Prisma.InputJsonValue;
      }
      return db.domicilio.update({ where: { id }, data });
    }),

  delete: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.domicilio.delete({ where: { id: input.id } });
    }),
});
