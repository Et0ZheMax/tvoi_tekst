import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const cwdEnvPath = path.resolve(process.cwd(), ".env");
const rootEnvPath = path.resolve(process.cwd(), "../..", ".env");
const envPath = fs.existsSync(cwdEnvPath) ? cwdEnvPath : fs.existsSync(rootEnvPath) ? rootEnvPath : undefined;

if (envPath) {
  dotenv.config({ path: envPath });
}

const args = process.argv.slice(2);
const result = spawnSync("prisma", args, {
  stdio: "inherit",
  shell: true,
  env: process.env
});

process.exit(result.status ?? 1);
