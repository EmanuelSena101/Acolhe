import { z } from "zod";
import { createTRPCRouter, rbacProcedure } from "../trpc";
import { db } from "@/server/db";

export const auditRouter = createTRPCRouter({
  listar: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL"])
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.string().optional(),
        entidade: z.string().optional(),
        acao: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const where: Record<string, unknown> = {};
      if (input.entidade) where.entidade = input.entidade;
      if (input.acao) where.acao = input.acao;

      const items = await db.auditLog.findMany({
        where,
        orderBy: { criadoEm: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        include: {
          usuario: { select: { nome: true, email: true } },
        },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),
});
