import { z } from "zod";
import { createTRPCRouter, rbacProcedure } from "../trpc";
import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";

export const exportacaoRouter = createTRPCRouter({
  gerarCSV: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(
      z.object({
        ubsId: z.string().optional(),
        equipeId: z.string().optional(),
        dataInicio: z.coerce.date().optional(),
        dataFim: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const job = await db.exportJob.create({
        data: {
          prefeituraId: ctx.session.user.prefeituraId ?? "",
          usuarioId: ctx.session.user.id,
          tipo: "CSV",
          filtros: input as unknown as Prisma.InputJsonValue,
          status: "PENDENTE",
        },
      });

      return { jobId: job.id, status: "PENDENTE" };
    }),

  gerarXML: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(
      z.object({
        ubsId: z.string().optional(),
        equipeId: z.string().optional(),
        dataInicio: z.coerce.date().optional(),
        dataFim: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const job = await db.exportJob.create({
        data: {
          prefeituraId: ctx.session.user.prefeituraId ?? "",
          usuarioId: ctx.session.user.id,
          tipo: "XML",
          filtros: input as unknown as Prisma.InputJsonValue,
          status: "PENDENTE",
        },
      });

      return { jobId: job.id, status: "PENDENTE" };
    }),

  status: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      const job = await db.exportJob.findUniqueOrThrow({
        where: { id: input.jobId },
      });

      return {
        id: job.id,
        tipo: job.tipo,
        status: job.status,
        arquivoUrl: job.arquivoUrl,
        criadoEm: job.criadoEm,
        concluidoEm: job.concluidoEm,
      };
    }),

  listar: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      return db.exportJob.findMany({
        where: { usuarioId: ctx.session.user.id },
        orderBy: { criadoEm: "desc" },
        take: input.limit,
        select: {
          id: true,
          tipo: true,
          status: true,
          arquivoUrl: true,
          criadoEm: true,
          concluidoEm: true,
        },
      });
    }),
});
