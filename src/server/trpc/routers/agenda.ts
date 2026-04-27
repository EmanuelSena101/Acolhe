import { z } from "zod";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";
import { gerarAgenda } from "@/server/services/agenda-generator";

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

      const agenda = await db.agendaDia.findUnique({
        where: {
          acsId_data: { acsId: input.acsId, data: dataDate },
        },
        include: {
          acs: {
            select: {
              usuario: { select: { nome: true } },
              equipe: { select: { nome: true, cor: true } },
            },
          },
        },
      });

      return agenda;
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
