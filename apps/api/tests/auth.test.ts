import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";

const shouldRun = Boolean(process.env.DATABASE_URL);

(shouldRun ? describe : describe.skip)("auth flow", () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it("registers and logs in", async () => {
    const register = await request(app.server)
      .post("/api/auth/register")
      .send({ email: "demo@example.com", password: "password123", displayName: "Demo" });

    expect(register.status).toBe(200);
    expect(register.body.accessToken).toBeDefined();

    const login = await request(app.server)
      .post("/api/auth/login")
      .send({ email: "demo@example.com", password: "password123" });

    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeDefined();
  });
});
