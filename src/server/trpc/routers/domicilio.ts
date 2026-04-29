import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";
import { rowsToFeatureCollection } from "@/lib/geo";

const STATUS_COLOR_EM_DIA = "#0F766E";
const STATUS_COLOR_PROXIMO = "#D97706";
const STATUS_COLOR_ATRASADO = "#BE123C";

function statusFromUltimaVisita(ultimaVisita: Date | null): {
  status: "em_dia" | "proximo_prazo" | "atrasado";
  color: string;
} {
  if (!ultimaVisita) return { status: "atrasado", color: STATUS_COLOR_ATRASADO };
  const diff = Date.now() - ultimaVisita.getTime();
  const dias = diff / (1000 * 60 * 60 * 24);
  if (dias <= 30) return { status: "em_dia", color: STATUS_COLOR_EM_DIA };
  if (dias <= 60) return { status: "proximo_prazo", color: STATUS_COLOR_PROXIMO };
  return { status: "atrasado", color: STATUS_COLOR_ATRASADO };
}

export const domicilioRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        prefeituraId: z.string().optional(),
        equipeId: z.string().optional(),
        microareaId: z.string().optional(),
        status: z.enum(["em_dia", "proximo_prazo", "atrasado", "all"]).default("all"),
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      const microareaWhere: Record<string, unknown> = {};
      if (input.equipeId) microareaWhere.equipeId = input.equipeId;
      if (input.prefeituraId) {
        microareaWhere.equipe = { ubs: { prefeituraId: input.prefeituraId } };
      }

      const where: Record<string, unknown> = {};
      if (input.microareaId) where.microareaId = input.microareaId;
      if (Object.keys(microareaWhere).length > 0) where.microarea = microareaWhere;

      if (input.search) {
        where.OR = [
          { logradouro: { contains: input.search, mode: "insensitive" } },
          { bairro: { contains: input.search, mode: "insensitive" } },
          { moradores: { some: { nome: { contains: input.search, mode: "insensitive" } } } },
        ];
      }

      if (input.status !== "all") {
        const now = new Date();
        const days30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const days60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        if (input.status === "em_dia") {
          where.ultimaVisita = { gte: days30 };
        } else if (input.status === "proximo_prazo") {
          where.ultimaVisita = { gte: days60, lt: days30 };
        } else {
          where.OR = [
            ...((where.OR as unknown[] | undefined) ?? []),
            { ultimaVisita: { lt: days60 } },
            { ultimaVisita: null },
          ];
        }
      }

      const [rawItems, total] = await Promise.all([
        db.domicilio.findMany({
          where,
          orderBy: [{ logradouro: "asc" }, { numero: "asc" }],
          skip: (input.page - 1) * input.perPage,
          take: input.perPage,
          include: {
            microarea: {
              select: {
                id: true,
                codigo: true,
                equipe: { select: { id: true, nome: true, cor: true } },
              },
            },
            _count: { select: { moradores: true, visitas: true } },
          },
        }),
        db.domicilio.count({ where }),
      ]);

      const items = rawItems.map((d) => {
        const { status: statusVisita } = statusFromUltimaVisita(d.ultimaVisita);
        return { ...d, statusVisita };
      });

      return { items, total, pages: Math.ceil(total / input.perPage) };
    }),

  listGeoJSON: protectedProcedure
    .input(
      z.object({
        prefeituraId: z.string().optional(),
        microareaId: z.string().optional(),
        equipeId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const microareaFilter = input.microareaId
        ? Prisma.sql`AND d."microareaId" = ${input.microareaId}`
        : Prisma.empty;
      const equipeFilter = input.equipeId
        ? Prisma.sql`AND m."equipeId" = ${input.equipeId}`
        : Prisma.empty;
      const prefeituraFilter = input.prefeituraId
        ? Prisma.sql`AND u."prefeituraId" = ${input.prefeituraId}`
        : Prisma.empty;

      type Row = {
        id: string;
        logradouro: string;
        numero: string;
        bairro: string;
        microareaId: string;
        microareaCodigo: string;
        equipeCor: string;
        totalMoradores: bigint;
        ultimaVisita: Date | null;
        geojson: string | null;
      };
      const rows = await db.$queryRaw<Row[]>(
        Prisma.sql`
          SELECT
            d.id,
            d.logradouro,
            d.numero,
            d.bairro,
            d."microareaId",
            m.codigo AS "microareaCodigo",
            e.cor AS "equipeCor",
            (SELECT COUNT(*) FROM "Morador" mor WHERE mor."domicilioId" = d.id AND mor.ativo) AS "totalMoradores",
            d."ultimaVisita",
            ST_AsGeoJSON(d.geom) AS geojson
          FROM "Domicilio" d
          JOIN "Microarea" m ON m.id = d."microareaId"
          JOIN "EquipeESF" e ON e.id = m."equipeId"
          JOIN "UBS" u ON u.id = e."ubsId"
          WHERE d.geom IS NOT NULL
          ${microareaFilter}
          ${equipeFilter}
          ${prefeituraFilter}
        `,
      );

      return rowsToFeatureCollection<Row>(rows, (r) => {
        const { status, color } = statusFromUltimaVisita(r.ultimaVisita);
        return {
          id: r.id,
          logradouro: r.logradouro,
          numero: r.numero,
          bairro: r.bairro,
          microareaId: r.microareaId,
          microareaCodigo: r.microareaCodigo,
          equipeCor: r.equipeCor,
          moradores: Number(r.totalMoradores),
          ultimaVisita: r.ultimaVisita ? r.ultimaVisita.toISOString().slice(0, 10) : null,
          status,
          statusColor: color,
        };
      });
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
