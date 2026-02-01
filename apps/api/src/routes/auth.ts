import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { ApiError } from "../lib/errors.js";
import { hashPassword, signAccessToken, signRefreshToken, verifyPassword, verifyRefreshToken } from "../lib/auth.js";
import { hashToken } from "../lib/token.js";
import { env } from "../config.js";
import { requireAuth } from "../lib/auth-middleware.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const authRoutes = async (app: FastifyInstance) => {
  app.post("/register", async (request, reply) => {
    const data = registerSchema.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ApiError(409, "CONFLICT", "Email already registered");
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
        emailVerified: false
      }
    });

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: "",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      }
    });

    const accessToken = signAccessToken({ sub: user.id, sessionId: session.id });
    const refreshToken = signRefreshToken({ sub: user.id, sessionId: session.id });

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: hashToken(refreshToken) }
    });

    reply.setCookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    reply.send({
      user: { id: user.id, email: user.email, displayName: user.displayName },
      accessToken
    });
  });

  app.post("/login", async (request, reply) => {
    const data = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid credentials");
    }

    const ok = await verifyPassword(user.passwordHash, data.password);
    if (!ok) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid credentials");
    }

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: "",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      }
    });

    const accessToken = signAccessToken({ sub: user.id, sessionId: session.id });
    const refreshToken = signRefreshToken({ sub: user.id, sessionId: session.id });

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: hashToken(refreshToken), userAgent: request.headers["user-agent"], ipAddress: request.ip }
    });

    reply.setCookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    reply.send({
      user: { id: user.id, email: user.email, displayName: user.displayName },
      accessToken
    });
  });

  app.post("/refresh", async (request, reply) => {
    const refreshToken = request.cookies.refresh_token;
    if (!refreshToken) {
      throw new ApiError(401, "UNAUTHORIZED", "Missing refresh token");
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid refresh token");
    }

    const session = await prisma.session.findUnique({ where: { id: payload.sessionId } });
    if (!session || session.revokedAt) {
      throw new ApiError(401, "UNAUTHORIZED", "Session expired");
    }

    const hashed = hashToken(refreshToken);
    if (session.refreshTokenHash !== hashed) {
      throw new ApiError(401, "UNAUTHORIZED", "Refresh token mismatch");
    }

    const newAccessToken = signAccessToken({ sub: payload.sub, sessionId: payload.sessionId });
    reply.send({ accessToken: newAccessToken });
  });

  app.post("/logout", async (request, reply) => {
    const refreshToken = request.cookies.refresh_token;
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await prisma.session.update({
          where: { id: payload.sessionId },
          data: { revokedAt: new Date() }
        });
      } catch (error) {
        // ignore invalid refresh token
      }
    }

    reply.clearCookie("refresh_token", { path: "/" });
    reply.send({ ok: true });
  });

  app.get("/me", { preHandler: [requireAuth] }, async (request) => {
    const user = await prisma.user.findUnique({ where: { id: request.user?.id } });
    if (!user) {
      throw new ApiError(404, "NOT_FOUND", "User not found");
    }

    return {
      user: { id: user.id, email: user.email, displayName: user.displayName, emailVerified: user.emailVerified }
    };
  });
};
