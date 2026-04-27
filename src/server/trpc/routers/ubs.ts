import { z } from "zod";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";

export const ubsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ prefeituraId: z.string() }))
    .query(async ({ input }) => {
      return db.uBS.findMany({
        where: { prefeituraId: input.prefeituraId },
        orderBy: { nome: "asc" },
        include: {
          _count: { select: { equipes: true } },
        },
      });
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.uBS.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        prefeitura: { select: { id: true, nome: true } },
        equipes: {
          include: {
            _count: { select: { acss: true, microareas: true } },
          },
        },
      },
    });
  }),

  create: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL"])
    .input(
      z.object({
        prefeituraId: z.string(),
        cnes: z.string().min(1).max(20),
        nome: z.string().min(2).max(200),
        endereco: z.string().min(2).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (
        ctx.session.user.papel === "COORD_MUNICIPAL" &&
        input.prefeituraId !== ctx.session.user.prefeituraId
      ) {
        throw new Error("Voce so pode criar UBS na sua prefeitura.");
      }
      return db.uBS.create({ data: input });
    }),

  update: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL"])
    .input(
      z.object({
        id: z.string(),
        nome: z.string().min(2).max(200).optional(),
        endereco: z.string().min(2).max(500).optional(),
      }),
    )
    .mutation(async ({ input: { id, ...data } }) => {
      return db.uBS.update({ where: { id }, data });
    }),

  delete: rbacProcedure(["SUPERADMIN"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.uBS.delete({ where: { id: input.id } });
    }),
});
