import { Queue } from "bullmq";
import { redis } from "./redis";

export const importQueue = new Queue("import", { connection: redis });

export const exportQueue = new Queue("export", { connection: redis });

export const agendaQueue = new Queue("agenda", { connection: redis });
