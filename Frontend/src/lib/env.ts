/**
 * StudyOS — Environment configuration
 *
 * Validates all required env vars once, at process startup (see
 * src/instrumentation.ts), instead of letting a missing var surface as a
 * confusing runtime error the first time some route happens to touch it.
 *
 * Import `env` instead of reading `process.env.X` directly in new code so
 * everything stays typed and centrally validated.
 */

import { z } from "zod";

const envSchema = z.object({
  // -- Auth (Clerk) --
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),

  // -- Database --
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required").refine(
    (v) => v.startsWith("mysql://"),
    "DATABASE_URL must be a mysql:// connection string",
  ),
  DB_POOL_SIZE: z.coerce.number().int().positive().default(10),

  // -- AgenticService --
  AGENTIC_SERVICE_URL: z.string().url().default("http://localhost:8000"),

  // Shared secret for the service-to-service JWT sent to AgenticService
  // (see src/lib/serviceAuth.ts). Must match INTERNAL_SERVICE_JWT_SECRET
  // in AgenticService/.env exactly.
  INTERNAL_SERVICE_JWT_SECRET: z
    .string()
    .min(32, "INTERNAL_SERVICE_JWT_SECRET must be at least 32 characters — generate with `openssl rand -hex 32`"),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Validates process.env against the schema. Throws (and, via
 * instrumentation.ts, crashes the process on boot) if anything required is
 * missing or malformed. Safe to call multiple times — cached after the
 * first successful parse.
 */
export function validateEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    console.error(`\n[env] Invalid environment configuration:\n${issues}\n`);
    throw new Error("Invalid environment configuration — see log above. Check .env.local against .env.local.example.");
  }

  _env = result.data;
  return _env;
}

/** Typed accessor — calls validateEnv() lazily so this stays cheap to import anywhere. */
export function getEnv(): Env {
  return validateEnv();
}
