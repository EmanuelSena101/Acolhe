import { z } from "zod";
import { createTRPCRouter, rbacProcedure } from "../trpc";
import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";
import { processExportJob } from "@/server/services/esus/exporter";

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

      processExportJob(job.id).catch((err) => {
        console.error(`Export CSV job ${job.id} failed:`, err);
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

      processExportJob(job.id).catch((err) => {
        console.error(`Export XML job ${job.id} failed:`, err);
      });

      return { jobId: job.id, status: "PENDENTE" };
    }),

  status: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { id: input.jobId };
      if (ctx.session.user.papel !== "SUPERADMIN") {
        where.prefeituraId = ctx.session.user.prefeituraId;
      }

      const job = await db.exportJob.findUniqueOrThrow({
        where: { id: input.jobId, ...where },
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
      const where: Record<string, unknown> = {};
      if (ctx.session.user.papel !== "SUPERADMIN") {
        where.prefeituraId = ctx.session.user.prefeituraId;
      }

      return db.exportJob.findMany({
        where,
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
