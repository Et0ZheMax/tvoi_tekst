import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { ApiError } from "../lib/errors.js";
import { requireAuth } from "../lib/auth-middleware.js";

const sendSchema = z.object({
  chatId: z.string().min(1),
  body: z.string().min(1)
});

const editSchema = z.object({
  body: z.string().min(1)
});

const listSchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional()
});

export const messageRoutes = async (app: FastifyInstance) => {
  app.get("/chat/:chatId", { preHandler: [requireAuth] }, async (request) => {
    const params = z.object({ chatId: z.string().min(1) }).parse(request.params);
    const query = listSchema.parse(request.query);

    const isMember = await prisma.chatMember.findFirst({
      where: { chatId: params.chatId, userId: request.user?.id }
    });
    if (!isMember) {
      throw new ApiError(403, "FORBIDDEN", "Not a chat member");
    }

    const limit = Number(query.limit ?? "20");
    const messages = await prisma.message.findMany({
      where: { chatId: params.chatId },
      take: limit + 1,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, displayName: true } },
        statuses: true
      }
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return { messages: items, nextCursor };
  });

  app.post("/", { preHandler: [requireAuth] }, async (request) => {
    const data = sendSchema.parse(request.body);
    const member = await prisma.chatMember.findFirst({
      where: { chatId: data.chatId, userId: request.user?.id }
    });
    if (!member) {
      throw new ApiError(403, "FORBIDDEN", "Not a chat member");
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          chatId: data.chatId,
          senderId: request.user?.id ?? "",
          body: data.body
        },
        include: { sender: { select: { id: true, displayName: true } } }
      });

      await tx.messageStatus.createMany({
        data: [
          {
            messageId: created.id,
            userId: request.user?.id ?? "",
            status: "SENT"
          }
        ]
      });

      return created;
    });

    return { message };
  });

  app.patch("/:messageId", { preHandler: [requireAuth] }, async (request) => {
    const params = z.object({ messageId: z.string().min(1) }).parse(request.params);
    const data = editSchema.parse(request.body);

    const existing = await prisma.message.findUnique({ where: { id: params.messageId } });
    if (!existing) {
      throw new ApiError(404, "NOT_FOUND", "Message not found");
    }
    if (existing.senderId !== request.user?.id) {
      throw new ApiError(403, "FORBIDDEN", "Cannot edit this message");
    }

    const message = await prisma.message.update({
      where: { id: params.messageId },
      data: { body: data.body }
    });

    return { message };
  });

  app.delete("/:messageId", { preHandler: [requireAuth] }, async (request) => {
    const params = z.object({ messageId: z.string().min(1) }).parse(request.params);
    const existing = await prisma.message.findUnique({ where: { id: params.messageId } });
    if (!existing) {
      throw new ApiError(404, "NOT_FOUND", "Message not found");
    }
    if (existing.senderId !== request.user?.id) {
      throw new ApiError(403, "FORBIDDEN", "Cannot delete this message");
    }

    const message = await prisma.message.update({
      where: { id: params.messageId },
      data: { deletedAt: new Date() }
    });

    return { message };
  });

  app.post("/:messageId/read", { preHandler: [requireAuth] }, async (request) => {
    const params = z.object({ messageId: z.string().min(1) }).parse(request.params);
    const existing = await prisma.message.findUnique({ where: { id: params.messageId } });
    if (!existing) {
      throw new ApiError(404, "NOT_FOUND", "Message not found");
    }

    const status = await prisma.messageStatus.upsert({
      where: { messageId_userId: { messageId: params.messageId, userId: request.user?.id ?? "" } },
      create: {
        messageId: params.messageId,
        userId: request.user?.id ?? "",
        status: "READ"
      },
      update: { status: "READ" }
    });

    return { status };
  });
};
