import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";

const STATUS_FILTER = z.enum([
  "PENDENTE",
  "REALIZADA",
  "RECUSADA",
  "AUSENTE",
  "CANCELADA",
  "ATRASADA",
]);

function periodoToRange(periodo: "semana" | "mes" | "tres_meses" | "all"): {
  dataInicio?: Date;
  dataFim?: Date;
} {
  if (periodo === "all") return {};
  const now = new Date();
  const dataFim = new Date(now);
  dataFim.setDate(dataFim.getDate() + 30);
  const dataInicio = new Date(now);
  if (periodo === "semana") dataInicio.setDate(dataInicio.getDate() - 7);
  else if (periodo === "mes") dataInicio.setDate(dataInicio.getDate() - 30);
  else dataInicio.setDate(dataInicio.getDate() - 90);
  return { dataInicio, dataFim };
}

export const visitaRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        prefeituraId: z.string().optional(),
        equipeId: z.string().optional(),
        microareaId: z.string().optional(),
        acsId: z.string().optional(),
        domicilioId: z.string().optional(),
        status: STATUS_FILTER.optional(),
        periodo: z.enum(["semana", "mes", "tres_meses", "all"]).default("mes"),
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = {};
      if (input.acsId) where.acsId = input.acsId;
      if (input.domicilioId) where.domicilioId = input.domicilioId;

      const now = new Date();
      if (input.status === "ATRASADA") {
        where.status = "PENDENTE";
        where.dataPrevista = { lt: now };
      } else if (input.status) {
        where.status = input.status;
      }

      const range = periodoToRange(input.periodo);
      if (input.status !== "ATRASADA" && (range.dataInicio || range.dataFim)) {
        where.dataPrevista = {
          ...(range.dataInicio && { gte: range.dataInicio }),
          ...(range.dataFim && { lte: range.dataFim }),
        };
      }

      const domicilioFilter: Record<string, unknown> = {};
      if (input.microareaId) domicilioFilter.microareaId = input.microareaId;
      if (input.equipeId) domicilioFilter.microarea = { equipeId: input.equipeId };
      if (input.prefeituraId)
        domicilioFilter.microarea = {
          ...(domicilioFilter.microarea as object | undefined),
          equipe: { ubs: { prefeituraId: input.prefeituraId } },
        };

      if (Object.keys(domicilioFilter).length > 0) {
        where.domicilio = domicilioFilter;
      }

      if (input.search) {
        const orClauses = [
          { domicilio: { logradouro: { contains: input.search, mode: "insensitive" } } },
          { domicilio: { bairro: { contains: input.search, mode: "insensitive" } } },
          {
            domicilio: {
              moradores: {
                some: { nome: { contains: input.search, mode: "insensitive" } },
              },
            },
          },
        ];
        where.OR = orClauses;
      }

      const [rawItems, total] = await Promise.all([
        db.visita.findMany({
          where,
          orderBy: { dataPrevista: "desc" },
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            acs: {
              select: {
                id: true,
                usuario: { select: { nome: true } },
                equipe: { select: { id: true, nome: true, cor: true } },
              },
            },
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
                    equipe: { select: { id: true, nome: true, cor: true } },
                  },
                },
                moradores: {
                  where: { ativo: true },
                  orderBy: [{ prioridade: "desc" }, { nome: "asc" }],
                  take: 1,
                  select: { id: true, nome: true, condicoes: true },
                },
              },
            },
          },
        }),
        db.visita.count({ where }),
      ]);

      const items = rawItems.map((v) => {
        const isAtrasada = v.status === "PENDENTE" && v.dataPrevista.getTime() < now.getTime();
        const diasAtraso = isAtrasada
          ? Math.floor((now.getTime() - v.dataPrevista.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        const principal = v.domicilio.moradores[0] ?? null;
        const condicoes = principal
          ? ((Array.isArray(principal.condicoes) ? principal.condicoes : []) as string[])
          : [];
        return { ...v, isAtrasada, diasAtraso, moradorPrincipal: principal, condicoes };
      });

      return { items, total, pages: Math.ceil(total / input.perPage) };
    }),

  kpis: protectedProcedure
    .input(
      z.object({
        prefeituraId: z.string().optional(),
        equipeId: z.string().optional(),
        microareaId: z.string().optional(),
        acsId: z.string().optional(),
        periodo: z.enum(["semana", "mes", "tres_meses", "all"]).default("mes"),
      }),
    )
    .query(async ({ input }) => {
      const now = new Date();
      const range = periodoToRange(input.periodo);

      const baseWhere: Record<string, unknown> = {};
      if (input.acsId) baseWhere.acsId = input.acsId;
      if (range.dataInicio || range.dataFim) {
        baseWhere.dataPrevista = {
          ...(range.dataInicio && { gte: range.dataInicio }),
          ...(range.dataFim && { lte: range.dataFim }),
        };
      }
      const domicilioFilter: Record<string, unknown> = {};
      if (input.microareaId) domicilioFilter.microareaId = input.microareaId;
      if (input.equipeId) domicilioFilter.microarea = { equipeId: input.equipeId };
      if (input.prefeituraId)
        domicilioFilter.microarea = {
          ...(domicilioFilter.microarea as object | undefined),
          equipe: { ubs: { prefeituraId: input.prefeituraId } },
        };
      if (Object.keys(domicilioFilter).length > 0) {
        baseWhere.domicilio = domicilioFilter;
      }

      const [realizadas, pendentes, atrasadas, agg] = await Promise.all([
        db.visita.count({ where: { ...baseWhere, status: "REALIZADA" } }),
        db.visita.count({ where: { ...baseWhere, status: "PENDENTE" } }),
        db.visita.count({
          where: { ...baseWhere, status: "PENDENTE", dataPrevista: { lt: now } },
        }),
        db.visita.aggregate({
          where: { ...baseWhere, status: "REALIZADA", duracaoMin: { not: null } },
          _avg: { duracaoMin: true },
        }),
      ]);

      const tempoMedio = agg._avg.duracaoMin ? Math.round(agg._avg.duracaoMin) : null;

      return { realizadas, pendentes, atrasadas, tempoMedio };
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const visita = await db.visita.findUniqueOrThrow({
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

    const coordsRows = await db.$queryRaw<{ lng: number | null; lat: number | null }[]>(
      Prisma.sql`SELECT ST_X(geom) AS lng, ST_Y(geom) AS lat FROM "Domicilio" WHERE id = ${visita.domicilioId}`,
    );
    const r = coordsRows[0];
    const coords =
      r && r.lng != null && r.lat != null ? { lat: Number(r.lat), lng: Number(r.lng) } : null;

    return { ...visita, coords };
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
