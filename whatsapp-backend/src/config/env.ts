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

  // Evolution API (WhatsApp) — all required: the whole feature depends on them.
  EVOLUTION_API_URL: z.url(), // e.g. http://localhost:8080
  EVOLUTION_API_KEY: z.string().min(1),

  // RabbitMQ — how Evolution events reach the backend (worker), no webhook.
  // amqp:// is a valid URL, but z.url() rejects non-http schemes, so match the
  // scheme explicitly instead.
  RABBITMQ_URL: z
    .string()
    .startsWith("amqp://", "must be an amqp:// connection string"),
  RABBITMQ_EVOLUTION_EXCHANGE: z.string().min(1).default("evolution"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = z.treeifyError(parsed.error);
  console.error("Invalid environment variables:", JSON.stringify(issues, null, 2));
  process.exit(1);
}

export const env = Object.freeze(parsed.data);

export type Env = typeof env;
