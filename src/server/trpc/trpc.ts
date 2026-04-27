import { initTRPC, TRPCError } from "@trpc/server";
import { type Papel } from "@prisma/client";
import superjson from "superjson";
import { ZodError } from "zod";
import { type Context } from "./context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);

export function rbacProcedure(allowedRoles: Papel[]) {
  return t.procedure.use(enforceAuth).use(({ ctx, next }) => {
    const papel = ctx.session.user.papel as Papel;
    if (!allowedRoles.includes(papel)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Voce nao tem permissao para acessar este recurso.",
      });
    }
    return next({ ctx });
  });
}
