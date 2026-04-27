import { TRPCError } from "@trpc/server";
import { type Papel } from "@prisma/client";
import { type Context } from "../context";

export function enforceRBAC(ctx: Context, allowedRoles: Papel[]) {
  const user = ctx.session?.user;
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const papel = user.papel as Papel;
  if (!allowedRoles.includes(papel)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Voce nao tem permissao para acessar este recurso.",
    });
  }

  return user;
}
