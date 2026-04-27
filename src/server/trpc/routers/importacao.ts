import { z } from "zod";
import { createTRPCRouter, rbacProcedure } from "../trpc";
import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";
import { processImportJob } from "@/server/services/esus/importer";

export const importacaoRouter = createTRPCRouter({
  iniciar: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(
      z.object({
        uploadId: z.string(),
        fileName: z.string(),
        fileSize: z.number().int().min(0),
        tipo: z.enum([
          "ESUS_CSV_FICHA_A",
          "ESUS_CSV_FICHA_B",
          "ESUS_CSV_VISITA",
          "ESUS_XML",
          "ESUS_ZIP",
          "AUTO",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tipo = input.tipo === "AUTO" ? detectTipoFromFileName(input.fileName) : input.tipo;

      const job = await db.importJob.create({
        data: {
          prefeituraId: ctx.session.user.prefeituraId ?? "",
          usuarioId: ctx.session.user.id,
          tipo,
          arquivoNome: input.fileName,
          arquivoUrl: `/uploads/${input.uploadId}/${input.fileName}`,
          arquivoSize: input.fileSize,
          status: "PENDENTE",
        },
      });

      processImportJob(job.id).catch((err) => {
        console.error(`Import job ${job.id} failed:`, err);
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

      const job = await db.importJob.findUniqueOrThrow({
        where: { id: input.jobId, ...where },
      });

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

  errosCSV: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS"])
    .input(z.object({ jobId: z.string() }))
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { id: input.jobId };
      if (ctx.session.user.papel !== "SUPERADMIN") {
        where.prefeituraId = ctx.session.user.prefeituraId;
      }

      const job = await db.importJob.findUniqueOrThrow({
        where: { id: input.jobId, ...where },
      });

      const logEntries = Array.isArray(job.log) ? job.log : [];

      const header = "Linha;Coluna;Valor;Mensagem;Severity\n";
      const rows = (logEntries as Prisma.JsonArray)
        .map((entry) => {
          const e = entry as Record<string, unknown>;
          return `${e.linha};${e.coluna};${e.valor};${e.erro};${e.severity}`;
        })
        .join("\n");

      return { csv: header + rows, fileName: `erros_${job.id}.csv` };
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
      const where: Record<string, unknown> = {};
      if (ctx.session.user.papel !== "SUPERADMIN") {
        where.prefeituraId = ctx.session.user.prefeituraId;
      }
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

function detectTipoFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "xml":
      return "ESUS_XML";
    case "zip":
      return "ESUS_ZIP";
    default:
      return "ESUS_CSV_FICHA_A";
  }
}
