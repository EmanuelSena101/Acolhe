import { z } from "zod";
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
