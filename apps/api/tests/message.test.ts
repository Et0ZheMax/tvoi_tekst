import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";

const shouldRun = Boolean(process.env.DATABASE_URL);

(shouldRun ? describe : describe.skip)("message flow", () => {
  const app = buildApp();
  let tokenA = "";
  let tokenB = "";
  let userBId = "";
  let chatId = "";

  beforeAll(async () => {
    await app.ready();

    const registerA = await request(app.server)
      .post("/api/auth/register")
      .send({ email: "a@example.com", password: "password123", displayName: "A" });
    tokenA = registerA.body.accessToken;

    const registerB = await request(app.server)
      .post("/api/auth/register")
      .send({ email: "b@example.com", password: "password123", displayName: "B" });
    tokenB = registerB.body.accessToken;
    userBId = registerB.body.user.id;

    const createChat = await request(app.server)
      .post("/api/chats/dm")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ peerId: userBId });

    chatId = createChat.body.chat.id;
  });

  afterAll(async () => {
    await prisma.messageStatus.deleteMany();
    await prisma.message.deleteMany();
    await prisma.chatMember.deleteMany();
    await prisma.chat.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it("sends and fetches messages", async () => {
    const send = await request(app.server)
      .post("/api/messages")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ chatId, body: "Hello" });

    expect(send.status).toBe(200);

    const list = await request(app.server)
      .get(`/api/messages/chat/${chatId}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(list.status).toBe(200);
    expect(list.body.messages.length).toBeGreaterThan(0);
  });
});
