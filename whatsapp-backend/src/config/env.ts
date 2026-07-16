import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  HOST: z.string().min(1).default("0.0.0.0"),

  DATABASE_URL: z.string().min(1),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  CLIENT_ORIGIN: z.url(),

  // Optional on purpose: email/password auth boots without them. The Google
  // provider is only registered when both are present (see lib/auth.ts).
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = z.treeifyError(parsed.error);
  console.error("Invalid environment variables:", JSON.stringify(issues, null, 2));
  process.exit(1);
}

export const env = Object.freeze(parsed.data);

export type Env = typeof env;
