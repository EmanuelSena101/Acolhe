import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { db } from "@/server/db";

export const relatoriosRouter = createTRPCRouter({
  coberturaMensal: protectedProcedure
    .input(
      z.object({
        prefeituraId: z.string(),
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2020).max(2030),
      }),
    )
    .query(async ({ input }) => {
      const dataInicio = new Date(input.ano, input.mes - 1, 1);
      const dataFim = new Date(input.ano, input.mes, 0, 23, 59, 59);

      const ubsList = await db.uBS.findMany({
        where: { prefeituraId: input.prefeituraId },
        select: { id: true },
      });
      const ubsIds = ubsList.map((u) => u.id);

      const [totalDomicilios, visitadosNoMes, totalAcs, acsAtivos] = await Promise.all([
        db.domicilio.count({
          where: { microarea: { equipe: { ubsId: { in: ubsIds } } } },
        }),
        db.domicilio.count({
          where: {
            microarea: { equipe: { ubsId: { in: ubsIds } } },
            ultimaVisita: { gte: dataInicio, lte: dataFim },
          },
        }),
        db.aCS.count({
          where: { equipe: { ubsId: { in: ubsIds } } },
        }),
        db.aCS.count({
          where: { equipe: { ubsId: { in: ubsIds } }, ativo: true },
        }),
      ]);

      const cobertura =
        totalDomicilios > 0 ? Math.round((visitadosNoMes / totalDomicilios) * 100) : 0;

      return {
        prefeituraId: input.prefeituraId,
        mes: input.mes,
        ano: input.ano,
        totalDomicilios,
        visitadosNoMes,
        cobertura,
        totalAcs,
        acsAtivos,
      };
    }),

  produtividadeAcs: protectedProcedure
    .input(
      z.object({
        acsId: z.string(),
        dataInicio: z.coerce.date(),
        dataFim: z.coerce.date(),
      }),
    )
    .query(async ({ input }) => {
      const [totalVisitas, realizadas, pendentes, canceladas] = await Promise.all([
        db.visita.count({
          where: {
            acsId: input.acsId,
            dataPrevista: { gte: input.dataInicio, lte: input.dataFim },
          },
        }),
        db.visita.count({
          where: {
            acsId: input.acsId,
            status: "REALIZADA",
            dataRealizada: { gte: input.dataInicio, lte: input.dataFim },
          },
        }),
        db.visita.count({
          where: {
            acsId: input.acsId,
            status: "PENDENTE",
            dataPrevista: { gte: input.dataInicio, lte: input.dataFim },
          },
        }),
        db.visita.count({
          where: {
            acsId: input.acsId,
            status: "CANCELADA",
            dataPrevista: { gte: input.dataInicio, lte: input.dataFim },
          },
        }),
      ]);

      return {
        acsId: input.acsId,
        periodo: { inicio: input.dataInicio, fim: input.dataFim },
        totalVisitas,
        realizadas,
        pendentes,
        canceladas,
        taxaRealizacao: totalVisitas > 0 ? Math.round((realizadas / totalVisitas) * 100) : 0,
      };
    }),

  visitasAtrasadas: protectedProcedure
    .input(
      z
        .object({
          ubsId: z.string().optional(),
          prefeituraId: z.string().optional(),
        })
        .refine((d) => d.ubsId || d.prefeituraId, {
          message: "ubsId ou prefeituraId obrigatorio",
        }),
    )
    .query(async ({ input }) => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const ubsFilter: Record<string, unknown> = {};
      if (input.ubsId) {
        ubsFilter.ubsId = input.ubsId;
      } else if (input.prefeituraId) {
        ubsFilter.ubs = { prefeituraId: input.prefeituraId };
      }

      const whereAtrasadas = {
        status: "PENDENTE" as const,
        dataPrevista: { lt: hoje },
        acs: { equipe: ubsFilter },
      };

      const [total, atrasadas] = await Promise.all([
        db.visita.count({ where: whereAtrasadas }),
        db.visita.findMany({
          where: whereAtrasadas,
          include: {
            acs: { select: { usuario: { select: { nome: true } } } },
            domicilio: {
              select: {
                logradouro: true,
                numero: true,
                microarea: { select: { codigo: true } },
              },
            },
          },
          orderBy: { dataPrevista: "asc" },
          take: 100,
        }),
      ]);

      return { total, visitas: atrasadas };
    }),

  charts: protectedProcedure
    .input(
      z.object({
        prefeituraId: z.string(),
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2020).max(2030),
      }),
    )
    .query(async ({ input }) => {
      const dataInicio = new Date(input.ano, input.mes - 1, 1);
      const dataFim = new Date(input.ano, input.mes, 0, 23, 59, 59);
      const ubsList = await db.uBS.findMany({
        where: { prefeituraId: input.prefeituraId },
        select: { id: true, nome: true },
      });
      const ubsIds = ubsList.map((u) => u.id);

      // 1. Status de visitas (pizza)
      const statusRows = await db.visita.groupBy({
        by: ["status"],
        where: {
          acs: { equipe: { ubsId: { in: ubsIds } } },
          dataPrevista: { gte: dataInicio, lte: dataFim },
        },
        _count: { _all: true },
      });
      const statusVisitas = statusRows.map((r) => ({
        status: r.status,
        total: r._count._all,
      }));

      // 2. Condições de saúde (pizza)
      const moradores = await db.morador.findMany({
        where: {
          ativo: true,
          domicilio: { microarea: { equipe: { ubsId: { in: ubsIds } } } },
        },
        select: { condicoes: true },
      });
      const condCount: Record<string, number> = {
        HIPERTENSO: 0,
        DIABETICO: 0,
        GESTANTE: 0,
        SAUDAVEL: 0,
      };
      for (const m of moradores) {
        const arr = Array.isArray(m.condicoes) ? (m.condicoes as string[]) : [];
        if (arr.length === 0) {
          condCount.SAUDAVEL++;
        } else {
          for (const c of arr) {
            if (condCount[c] !== undefined) condCount[c]++;
          }
        }
      }
      const condicoes = Object.entries(condCount).map(([nome, total]) => ({
        nome,
        total,
      }));

      // 3. Cobertura por UBS (barra horizontal)
      const coberturaPorUbs = await Promise.all(
        ubsList.map(async (ubs) => {
          const [total, visitados] = await Promise.all([
            db.domicilio.count({ where: { microarea: { equipe: { ubsId: ubs.id } } } }),
            db.domicilio.count({
              where: {
                microarea: { equipe: { ubsId: ubs.id } },
                ultimaVisita: { gte: dataInicio, lte: dataFim },
              },
            }),
          ]);
          return {
            ubs: ubs.nome,
            total,
            visitados,
            cobertura: total > 0 ? Math.round((visitados / total) * 100) : 0,
          };
        }),
      );

      // 4. Produtividade por ACS (barra vertical) — top 10
      type ProdutividadeRow = { acsNome: string; realizadas: bigint };
      const produtividadeRaw = await db.$queryRaw<ProdutividadeRow[]>(
        Prisma.sql`
          SELECT u.nome AS "acsNome", COUNT(v.id) AS realizadas
          FROM "ACS" a
          JOIN "Usuario" u ON u.id = a."usuarioId"
          JOIN "EquipeESF" e ON e.id = a."equipeId"
          LEFT JOIN "Visita" v ON v."acsId" = a.id
            AND v.status = 'REALIZADA'
            AND v."dataRealizada" BETWEEN ${dataInicio} AND ${dataFim}
          WHERE e."ubsId" IN (${Prisma.join(ubsIds.length > 0 ? ubsIds : [""])})
          GROUP BY a.id, u.nome
          ORDER BY realizadas DESC
          LIMIT 10
        `,
      );
      const produtividadeAcs = produtividadeRaw.map((r) => ({
        acs: r.acsNome,
        realizadas: Number(r.realizadas),
      }));

      // 5. Visitas por dia (linha) — últimos 30 dias
      type DiaRow = { dia: Date; total: bigint };
      const diasRaw = await db.$queryRaw<DiaRow[]>(
        Prisma.sql`
          SELECT date_trunc('day', v."dataRealizada") AS dia, COUNT(*) AS total
          FROM "Visita" v
          JOIN "ACS" a ON a.id = v."acsId"
          JOIN "EquipeESF" e ON e.id = a."equipeId"
          WHERE e."ubsId" IN (${Prisma.join(ubsIds.length > 0 ? ubsIds : [""])})
            AND v.status = 'REALIZADA'
            AND v."dataRealizada" >= NOW() - INTERVAL '30 days'
            AND v."dataRealizada" IS NOT NULL
          GROUP BY dia
          ORDER BY dia ASC
        `,
      );
      const visitasPorDia = diasRaw.map((r) => ({
        dia: r.dia.toISOString().slice(0, 10),
        total: Number(r.total),
      }));

      return {
        statusVisitas,
        condicoes,
        coberturaPorUbs,
        produtividadeAcs,
        visitasPorDia,
      };
    }),

  kpis: protectedProcedure
    .input(z.object({ prefeituraId: z.string() }))
    .query(async ({ input }) => {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      const ubsList = await db.uBS.findMany({
        where: { prefeituraId: input.prefeituraId },
        select: { id: true },
      });
      const ubsIds = ubsList.map((u) => u.id);

      const [totalDomicilios, visitadosMes, atrasadas, acsAtivos] = await Promise.all([
        db.domicilio.count({
          where: { microarea: { equipe: { ubsId: { in: ubsIds } } } },
        }),
        db.domicilio.count({
          where: {
            microarea: { equipe: { ubsId: { in: ubsIds } } },
            ultimaVisita: { gte: inicioMes },
          },
        }),
        db.visita.count({
          where: {
            status: "PENDENTE",
            dataPrevista: { lt: hoje },
            acs: { equipe: { ubsId: { in: ubsIds } } },
          },
        }),
        db.aCS.count({
          where: { equipe: { ubsId: { in: ubsIds } }, ativo: true },
        }),
      ]);

      return {
        totalDomicilios,
        coberturaMensal:
          totalDomicilios > 0 ? Math.round((visitadosMes / totalDomicilios) * 100) : 0,
        visitasAtrasadas: atrasadas,
        acsAtivos,
      };
    }),
});
