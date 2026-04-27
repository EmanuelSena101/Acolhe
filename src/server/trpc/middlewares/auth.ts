import { TRPCError } from "@trpc/server";
import { type Context } from "../context";

export function enforceAuth(ctx: Context) {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sessao nao encontrada. Faca login para continuar.",
    });
  }
  return ctx.session.user;
}
