import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/server/trpc/routers/_app";
import { createContext } from "@/server/trpc/context";
import { auth } from "@/server/auth";

async function handler(req: NextRequest) {
  const session = await auth();
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createContext({
        session,
        ip: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
      }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`tRPC error on ${path ?? "<no-path>"}:`, error);
          }
        : undefined,
  });
}

export { handler as GET, handler as POST };
