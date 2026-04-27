import { z } from "zod";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";

export const visitaRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        acsId: z.string().optional(),
        domicilioId: z.string().optional(),
        status: z.enum(["PENDENTE", "REALIZADA", "RECUSADA", "AUSENTE", "CANCELADA"]).optional(),
        dataInicio: z.coerce.date().optional(),
        dataFim: z.coerce.date().optional(),
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = {};
      if (input.acsId) where.acsId = input.acsId;
      if (input.domicilioId) where.domicilioId = input.domicilioId;
      if (input.status) where.status = input.status;
      if (input.dataInicio || input.dataFim) {
        where.dataPrevista = {
          ...(input.dataInicio && { gte: input.dataInicio }),
          ...(input.dataFim && { lte: input.dataFim }),
        };
      }

      const [items, total] = await Promise.all([
        db.visita.findMany({
          where,
          orderBy: { dataPrevista: "desc" },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            acs: {
              select: { usuario: { select: { nome: true } } },
            },
            domicilio: {
              select: {
                logradouro: true,
                numero: true,
                microarea: { select: { codigo: true } },
              },
            },
          },
        }),
        db.visita.count({ where }),
      ]);

      return { items, total, pages: Math.ceil(total / input.perPage) };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.visita.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        acs: {
          select: {
            id: true,
            usuario: { select: { nome: true } },
            equipe: { select: { nome: true, cor: true } },
          },
        },
        domicilio: {
          select: {
            id: true,
            logradouro: true,
            numero: true,
            bairro: true,
            moradores: {
              where: { ativo: true },
              select: { id: true, nome: true, prioridade: true },
            },
          },
        },
      },
    });
  }),

  registrar: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "ACS"])
    .input(
      z.object({
        acsId: z.string(),
        domicilioId: z.string(),
        dataPrevista: z.coerce.date(),
        status: z.enum(["PENDENTE", "REALIZADA", "RECUSADA", "AUSENTE"]).default("PENDENTE"),
        dataRealizada: z.coerce.date().optional(),
        motivoRecusa: z.string().max(500).optional(),
        observacoes: z.string().max(2000).optional(),
        duracaoMin: z.number().int().min(1).max(480).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        const visita = await tx.visita.create({ data: input });

        if (input.status === "REALIZADA" && input.dataRealizada) {
          await tx.domicilio.update({
            where: { id: input.domicilioId },
            data: { ultimaVisita: input.dataRealizada },
          });
        }

        return visita;
      });
    }),

  atualizar: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "ACS"])
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["PENDENTE", "REALIZADA", "RECUSADA", "AUSENTE"]),
        dataRealizada: z.coerce.date().optional(),
        motivoRecusa: z.string().max(500).optional(),
        observacoes: z.string().max(2000).optional(),
        duracaoMin: z.number().int().min(1).max(480).optional(),
      }),
    )
    .mutation(async ({ input: { id, ...data } }) => {
      return db.$transaction(async (tx) => {
        const visita = await tx.visita.update({
          where: { id },
          data,
        });

        if (data.status === "REALIZADA" && data.dataRealizada) {
          await tx.domicilio.update({
            where: { id: visita.domicilioId },
            data: { ultimaVisita: data.dataRealizada },
          });
        }

        return visita;
      });
    }),

  checkin: rbacProcedure(["ACS"])
    .input(
      z.object({
        id: z.string(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        observacoes: z.string().max(2000).optional(),
        duracaoMin: z.number().int().min(1).max(480).optional(),
      }),
    )
    .mutation(async ({ input: { id, lat, lng, ...data } }) => {
      const now = new Date();
      return db.$transaction(async (tx) => {
        const visita = await tx.visita.update({
          where: { id },
          data: {
            ...data,
            status: "REALIZADA",
            dataRealizada: now,
            latCheckin: lat,
            lngCheckin: lng,
          },
        });

        await tx.domicilio.update({
          where: { id: visita.domicilioId },
          data: { ultimaVisita: now },
        });

        return visita;
      });
    }),

  cancelar: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.visita.update({
        where: { id: input.id },
        data: { status: "CANCELADA" },
      });
    }),
});
