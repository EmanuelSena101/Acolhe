import { createTRPCRouter } from "../trpc";
import { authRouter } from "./auth";
import { prefeituraRouter } from "./prefeitura";
import { ubsRouter } from "./ubs";
import { equipeRouter } from "./equipe";
import { acsRouter } from "./acs";
import { microareaRouter } from "./microarea";
import { domicilioRouter } from "./domicilio";
import { moradorRouter } from "./morador";
import { visitaRouter } from "./visita";
import { agendaRouter } from "./agenda";
import { importacaoRouter } from "./importacao";
import { exportacaoRouter } from "./exportacao";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  prefeitura: prefeituraRouter,
  ubs: ubsRouter,
  equipe: equipeRouter,
  acs: acsRouter,
  microarea: microareaRouter,
  domicilio: domicilioRouter,
  morador: moradorRouter,
  visita: visitaRouter,
  agenda: agendaRouter,
  importacao: importacaoRouter,
  exportacao: exportacaoRouter,
});

export type AppRouter = typeof appRouter;
