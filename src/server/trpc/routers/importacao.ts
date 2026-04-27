import { z } from "zod";
import { createTRPCRouter, rbacProcedure } from "../trpc";
import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";

export const importacaoRouter = createTRPCRouter({
  iniciar: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(
      z.object({
        uploadId: z.string(),
        tipo: z.enum(["FICHA_A", "FICHA_B", "VISITA", "AUTO"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const job = await db.importJob.create({
        data: {
          prefeituraId: ctx.session.user.prefeituraId ?? "",
          usuarioId: ctx.session.user.id,
          tipo: input.tipo,
          arquivoNome: input.uploadId,
          arquivoUrl: `/uploads/${input.uploadId}`,
          arquivoSize: 0,
          status: "PENDENTE",
        },
      });

      return { jobId: job.id };
    }),

  status: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { id: input.jobId };
      if (ctx.session.user.papel !== "SUPERADMIN") {
        where.prefeituraId = ctx.session.user.prefeituraId;
      }

      const job = await db.importJob.findUniqueOrThrow({ where: { id: input.jobId, ...where } });

      const logEntries = Array.isArray(job.log) ? job.log : [];
      const primeirosErros = (logEntries as Prisma.JsonArray).slice(0, 100);

      return {
        id: job.id,
        tipo: job.tipo,
        arquivoNome: job.arquivoNome,
        status: job.status,
        totalLinhas: job.totalLinhas,
        totalSucesso: job.totalSucesso,
        totalErro: job.totalErro,
        erros: primeirosErros,
        iniciadoEm: job.iniciadoEm,
        concluidoEm: job.concluidoEm,
        criadoEm: job.criadoEm,
      };
    }),

  listarMeus: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(
      z.object({
        status: z
          .enum(["PENDENTE", "PROCESSANDO", "CONCLUIDO", "CONCLUIDO_COM_ERROS", "ERRO"])
          .optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        usuarioId: ctx.session.user.id,
      };
      if (input.status) where.status = input.status;

      return db.importJob.findMany({
        where,
        orderBy: { criadoEm: "desc" },
        take: input.limit,
        select: {
          id: true,
          tipo: true,
          arquivoNome: true,
          status: true,
          totalLinhas: true,
          totalSucesso: true,
          totalErro: true,
          criadoEm: true,
          concluidoEm: true,
        },
      });
    }),
});
