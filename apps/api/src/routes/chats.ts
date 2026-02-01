import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { ApiError } from "../lib/errors.js";
import { requireAuth } from "../lib/auth-middleware.js";

const createDmSchema = z.object({
  peerId: z.string().min(1)
});

export const chatRoutes = async (app: FastifyInstance) => {
  app.get("/", { preHandler: [requireAuth] }, async (request) => {
    const chats = await prisma.chat.findMany({
      where: {
        members: {
          some: {
            userId: request.user?.id
          }
        }
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, displayName: true } }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    return { chats };
  });

  app.get("/search", { preHandler: [requireAuth] }, async (request) => {
    const query = z.object({ q: z.string().min(1) }).parse(request.query);
    const chats = await prisma.chat.findMany({
      where: {
        members: {
          some: {
            userId: request.user?.id,
            user: {
              displayName: { contains: query.q, mode: "insensitive" }
            }
          }
        }
      },
      include: {
        members: { include: { user: { select: { id: true, displayName: true, email: true } } } }
      }
    });

    return { chats };
  });

  app.post("/dm", { preHandler: [requireAuth] }, async (request) => {
    const data = createDmSchema.parse(request.body);
    if (data.peerId === request.user?.id) {
      throw new ApiError(400, "VALIDATION_ERROR", "Cannot create DM with self");
    }

    const existing = await prisma.chat.findFirst({
      where: {
        type: "DM",
        members: {
          every: {
            userId: { in: [request.user?.id ?? "", data.peerId] }
          }
        }
      }
    });

    if (existing) {
      return { chat: existing };
    }

    const chat = await prisma.$transaction(async (tx) => {
      const created = await tx.chat.create({
        data: {
          type: "DM"
        }
      });

      await tx.chatMember.createMany({
        data: [
          { chatId: created.id, userId: request.user?.id ?? "" },
          { chatId: created.id, userId: data.peerId }
        ]
      });

      return created;
    });

    return { chat };
  });
};
