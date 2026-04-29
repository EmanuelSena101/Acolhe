import { z } from "zod";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";
import { gerarAgenda } from "@/server/services/agenda-generator";

function calcularIdade(nascimento: Date | string): number {
  const nasc = new Date(nascimento);
  const now = new Date();
  let idade = now.getFullYear() - nasc.getFullYear();
  const m = now.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < nasc.getDate())) idade--;
  return idade;
}

export const agendaRouter = createTRPCRouter({
  obter: protectedProcedure
    .input(
      z.object({
        acsId: z.string(),
        data: z.coerce.date(),
      }),
    )
    .query(async ({ input }) => {
      const dataDate = new Date(input.data);
      dataDate.setHours(0, 0, 0, 0);
      const dataFim = new Date(dataDate);
      dataFim.setHours(23, 59, 59, 999);

      const agenda = await db.agendaDia.findUnique({
        where: { acsId_data: { acsId: input.acsId, data: dataDate } },
        include: {
          acs: {
            select: {
              usuario: { select: { nome: true } },
              equipe: { select: { nome: true, cor: true } },
            },
          },
        },
      });

      if (!agenda) return null;

      type VisitaItem = {
        ordem: number;
        domicilioId: string;
        logradouro: string;
        numero: string;
        prioridade: number;
        condicoes: string[];
      };
      const items = (agenda.visitasOrdem as unknown as VisitaItem[]) ?? [];
      const domicilioIds = items.map((v) => v.domicilioId);

      const [domicilios, visitasHoje] = await Promise.all([
        db.domicilio.findMany({
          where: { id: { in: domicilioIds } },
          select: {
            id: true,
            bairro: true,
            moradores: {
              where: { ativo: true },
              orderBy: [{ prioridade: "desc" }, { nome: "asc" }],
              take: 1,
              select: { nome: true, nascimento: true },
            },
          },
        }),
        db.visita.findMany({
          where: {
            acsId: input.acsId,
            domicilioId: { in: domicilioIds },
            OR: [
              { dataRealizada: { gte: dataDate, lte: dataFim } },
              { dataPrevista: { gte: dataDate, lte: dataFim } },
            ],
          },
          select: {
            id: true,
            domicilioId: true,
            status: true,
            dataRealizada: true,
            duracaoMin: true,
          },
          orderBy: { criadoEm: "desc" },
        }),
      ]);

      const domById = new Map(domicilios.map((d) => [d.id, d]));
      const visByDomicilio = new Map<string, (typeof visitasHoje)[number]>();
      for (const v of visitasHoje) {
        const existing = visByDomicilio.get(v.domicilioId);
        if (!existing || (v.status === "REALIZADA" && existing.status !== "REALIZADA")) {
          visByDomicilio.set(v.domicilioId, v);
        }
      }

      const enriched = items.map((item) => {
        const dom = domById.get(item.domicilioId);
        const morador = dom?.moradores[0] ?? null;
        const idade = morador ? calcularIdade(morador.nascimento) : null;
        const v = visByDomicilio.get(item.domicilioId);
        const statusUI: "concluida" | "pendente" =
          v?.status === "REALIZADA" ? "concluida" : "pendente";
        return {
          ordem: item.ordem ?? 0,
          domicilioId: item.domicilioId,
          logradouro: item.logradouro ?? "",
          numero: item.numero ?? "",
          bairro: dom?.bairro ?? "",
          prioridade: item.prioridade ?? 0,
          condicoes: Array.isArray(item.condicoes) ? item.condicoes : [],
          moradorPrincipal: morador ? { nome: morador.nome, idade } : null,
          statusUI,
          horario:
            v?.status === "REALIZADA" && v.dataRealizada
              ? new Date(v.dataRealizada).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null,
          visitaId: v?.id ?? null,
        };
      });

      return {
        id: agenda.id,
        acsId: agenda.acsId,
        data: agenda.data,
        geradaEm: agenda.geradaEm,
        acs: agenda.acs,
        visitas: enriched,
      };
    }),

  gerar: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "ACS"])
    .input(
      z.object({
        acsId: z.string(),
        data: z.coerce.date(),
      }),
    )
    .mutation(async ({ input }) => {
      return gerarAgenda(input.acsId, input.data);
    }),

  gerarLote: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL"])
    .input(
      z.object({
        data: z.coerce.date(),
      }),
    )
    .mutation(async ({ input }) => {
      const acsList = await db.aCS.findMany({
        where: { ativo: true },
        select: { id: true },
      });

      const results = [];
      for (const acs of acsList) {
        const result = await gerarAgenda(acs.id, input.data);
        results.push({ acsId: acs.id, ...result });
      }

      return { total: results.length, results };
    }),
});
