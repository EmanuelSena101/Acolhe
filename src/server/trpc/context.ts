import { type Session } from "next-auth";
import { db } from "@/server/db";

export type Context = {
  db: typeof db;
  session: Session | null;
  ip?: string;
  userAgent?: string;
};

export async function createContext(opts: {
  session: Session | null;
  ip?: string;
  userAgent?: string;
}): Promise<Context> {
  return {
    db,
    session: opts.session,
    ip: opts.ip,
    userAgent: opts.userAgent,
  };
}
