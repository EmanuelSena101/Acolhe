import { type Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { type Context } from "../context";

export async function createAuditLog(
  ctx: Context,
  data: {
    acao: string;
    entidade: string;
    entidadeId?: string;
    payload?: Prisma.InputJsonValue;
  },
) {
  await db.auditLog.create({
    data: {
      usuarioId: ctx.session?.user?.id ?? null,
      acao: data.acao,
      entidade: data.entidade,
      entidadeId: data.entidadeId,
      payload: data.payload ?? undefined,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    },
  });
}
