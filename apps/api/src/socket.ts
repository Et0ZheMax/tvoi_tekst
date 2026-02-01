import { FastifyInstance } from "fastify";
import { Server } from "socket.io";
import { verifyAccessToken } from "./lib/auth.js";
import { prisma } from "./prisma.js";
import { env } from "./config.js";

const onlineUsers = new Map<string, number>();

export const registerSocket = (app: FastifyInstance) => {
  const io = new Server(app.server, {
    cors: {
      origin: env.CORS_ORIGIN.split(","),
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== "string") {
      return next(new Error("Unauthorized"));
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch (error) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    onlineUsers.set(userId, (onlineUsers.get(userId) ?? 0) + 1);
    io.emit("presence", { userId, status: "online" });

    socket.on("join", async (chatId: string) => {
      if (!chatId) return;
      const member = await prisma.chatMember.findFirst({ where: { chatId, userId } });
      if (!member) return;
      socket.join(chatId);
    });

    socket.on("typing", (payload: { chatId: string; isTyping: boolean }) => {
      if (!payload?.chatId) return;
      socket.to(payload.chatId).emit("typing", { userId, chatId: payload.chatId, isTyping: payload.isTyping });
    });

    socket.on("message", async (payload: { chatId: string; body: string }) => {
      if (!payload?.chatId || !payload?.body) return;
      const member = await prisma.chatMember.findFirst({ where: { chatId: payload.chatId, userId } });
      if (!member) return;

      const message = await prisma.message.create({
        data: {
          chatId: payload.chatId,
          senderId: userId,
          body: payload.body
        },
        include: { sender: { select: { id: true, displayName: true } } }
      });

      await prisma.messageStatus.createMany({
        data: [
          {
            messageId: message.id,
            userId,
            status: "SENT"
          }
        ]
      });

      io.to(payload.chatId).emit("message", message);
    });

    socket.on("disconnect", () => {
      const count = (onlineUsers.get(userId) ?? 1) - 1;
      if (count <= 0) {
        onlineUsers.delete(userId);
        io.emit("presence", { userId, status: "offline" });
      } else {
        onlineUsers.set(userId, count);
      }
    });
  });
};
