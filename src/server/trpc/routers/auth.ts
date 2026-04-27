import { z } from "zod";
import { hash } from "bcryptjs";
import { createTRPCRouter, protectedProcedure, rbacProcedure } from "../trpc";
import { db } from "@/server/db";

export const authRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.usuario.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        email: true,
        nome: true,
        papel: true,
        prefeituraId: true,
        ativo: true,
        ultimoLogin: true,
        criadoEm: true,
        prefeitura: {
          select: { id: true, nome: true, uf: true },
        },
        acs: {
          select: {
            id: true,
            equipeId: true,
            matricula: true,
            equipe: {
              select: { id: true, nome: true, cor: true, ubsId: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error("Usuario nao encontrado.");
    }

    return user;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(2).max(100).optional(),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(6).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {};

      if (input.nome) {
        updates.nome = input.nome;
      }

      if (input.newPassword) {
        if (!input.currentPassword) {
          throw new Error("Senha atual e obrigatoria para alterar a senha.");
        }

        const user = await db.usuario.findUnique({
          where: { id: ctx.session.user.id },
          select: { senhaHash: true },
        });

        if (!user?.senhaHash) {
          throw new Error("Usuario sem senha cadastrada.");
        }

        const { compare } = await import("bcryptjs");
        const isValid = await compare(input.currentPassword, user.senhaHash);
        if (!isValid) {
          throw new Error("Senha atual incorreta.");
        }

        updates.senhaHash = await hash(input.newPassword, 12);
      }

      if (Object.keys(updates).length === 0) {
        throw new Error("Nenhum campo para atualizar.");
      }

      return db.usuario.update({
        where: { id: ctx.session.user.id },
        data: updates,
        select: { id: true, nome: true, email: true },
      });
    }),

  listUsers: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL"])
    .input(
      z.object({
        prefeituraId: z.string().optional(),
        papel: z
          .enum(["SUPERADMIN", "COORD_MUNICIPAL", "GERENTE_UBS", "ACS", "VISUALIZADOR"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (ctx.session.user.papel === "COORD_MUNICIPAL") {
        where.prefeituraId = ctx.session.user.prefeituraId;
      } else if (input.prefeituraId) {
        where.prefeituraId = input.prefeituraId;
      }

      if (input.papel) {
        where.papel = input.papel;
      }

      return db.usuario.findMany({
        where,
        select: {
          id: true,
          email: true,
          nome: true,
          papel: true,
          ativo: true,
          ultimoLogin: true,
          criadoEm: true,
          prefeitura: { select: { nome: true } },
        },
        orderBy: { criadoEm: "desc" },
      });
    }),

  createUser: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL"])
    .input(
      z.object({
        email: z.string().email(),
        nome: z.string().min(2).max(100),
        senha: z.string().min(6).max(100),
        papel: z.enum(["COORD_MUNICIPAL", "GERENTE_UBS", "ACS", "VISUALIZADOR"]),
        prefeituraId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (
        ctx.session.user.papel === "COORD_MUNICIPAL" &&
        input.prefeituraId !== ctx.session.user.prefeituraId
      ) {
        throw new Error("Voce so pode criar usuarios na sua prefeitura.");
      }

      const senhaHash = await hash(input.senha, 12);

      return db.usuario.create({
        data: {
          email: input.email,
          nome: input.nome,
          senhaHash,
          papel: input.papel,
          prefeituraId: input.prefeituraId,
        },
        select: { id: true, email: true, nome: true, papel: true },
      });
    }),

  toggleUserActive: rbacProcedure(["SUPERADMIN", "COORD_MUNICIPAL"])
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const target = await db.usuario.findUnique({
        where: { id: input.userId },
        select: { ativo: true, prefeituraId: true },
      });

      if (!target) throw new Error("Usuario nao encontrado.");

      if (
        ctx.session.user.papel === "COORD_MUNICIPAL" &&
        target.prefeituraId !== ctx.session.user.prefeituraId
      ) {
        throw new Error("Voce so pode gerenciar usuarios na sua prefeitura.");
      }

      return db.usuario.update({
        where: { id: input.userId },
        data: { ativo: !target.ativo },
        select: { id: true, ativo: true },
      });
    }),
});
