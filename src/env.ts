import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(1),
    GOVBR_CLIENT_ID: z.string().optional(),
    GOVBR_CLIENT_SECRET: z.string().optional(),
    GOVBR_ENV: z.enum(["staging", "production"]).default("staging"),
    GOVBR_REDIRECT_URI: z.string().url().optional(),
    RESEND_API_KEY: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
    UPLOADS_DIR: z.string().default("./public/uploads"),
    MAX_UPLOAD_SIZE_MB: z.coerce.number().default(20),
    OSM_USER_AGENT: z.string().default("SaudeTerritorio-MVP/1.0 (contato@example.com)"),
  },
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOVBR_CLIENT_ID: process.env.GOVBR_CLIENT_ID,
    GOVBR_CLIENT_SECRET: process.env.GOVBR_CLIENT_SECRET,
    GOVBR_ENV: process.env.GOVBR_ENV,
    GOVBR_REDIRECT_URI: process.env.GOVBR_REDIRECT_URI,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    UPLOADS_DIR: process.env.UPLOADS_DIR,
    MAX_UPLOAD_SIZE_MB: process.env.MAX_UPLOAD_SIZE_MB,
    OSM_USER_AGENT: process.env.OSM_USER_AGENT,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
