import { z } from "zod";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

const cwdEnvPath = path.resolve(process.cwd(), ".env");
const rootEnvPath = path.resolve(process.cwd(), "../..", ".env");
const envPath = fs.existsSync(cwdEnvPath) ? cwdEnvPath : fs.existsSync(rootEnvPath) ? rootEnvPath : undefined;

dotenv.config(envPath ? { path: envPath } : undefined);

const isProdEnv = process.env.NODE_ENV === "production";

const devFallbacks = isProdEnv
  ? {}
  : {
      DATABASE_URL: "postgresql://tvoi:tvoi_password@localhost:5432/tvoi_tekst",
      JWT_ACCESS_SECRET: "dev_access_secret_32_chars_minimum_length",
      JWT_REFRESH_SECRET: "dev_refresh_secret_32_chars_minimum_length",
      ACCESS_TOKEN_TTL: "15m",
      REFRESH_TOKEN_TTL: "30d",
      PORT: "7777",
      CORS_ORIGIN: "http://localhost:7001",
      COOKIE_SECURE: "false",
      RATE_LIMIT_MAX: "100",
      RATE_LIMIT_WINDOW: "1 minute"
    };

const envSource = { ...devFallbacks, ...process.env };

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("7777"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("30d"),
  CORS_ORIGIN: z.string().default("http://localhost:7001"),
  COOKIE_SECURE: z.string().default("false"),
  RATE_LIMIT_MAX: z.string().default("100"),
  RATE_LIMIT_WINDOW: z.string().default("1 minute")
});

export const env = envSchema.parse(envSource);

export const isProduction = env.NODE_ENV === "production";
export const isSecureCookie = env.COOKIE_SECURE === "true";
