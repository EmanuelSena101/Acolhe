import { db } from "@/server/db";
import { Prisma } from "@prisma/client";

interface AuditOptions {
  usuarioId?: string;
  acao: string;
  entidade: string;
  entidadeId?: string;
  payload?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export async function registrarAudit(opts: AuditOptions): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        usuarioId: opts.usuarioId ?? null,
        acao: opts.acao,
        entidade: opts.entidade,
        entidadeId: opts.entidadeId ?? null,
        payload: opts.payload
          ? (opts.payload as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        ip: opts.ip ?? null,
        userAgent: opts.userAgent ?? null,
      },
    });
  } catch {
    console.error("Erro ao registrar audit log:", opts);
  }
}
