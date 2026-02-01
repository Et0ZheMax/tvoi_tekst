import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env, isSecureCookie } from "./config.js";
import { ApiError, errorResponse } from "./lib/errors.js";
import { authRoutes } from "./routes/auth.js";
import { chatRoutes } from "./routes/chats.js";
import { messageRoutes } from "./routes/messages.js";
import { healthRoutes } from "./routes/health.js";
import { registerSocket } from "./socket.js";

export const buildApp = () => {
  const app = Fastify({
    logger: {
      level: "info",
      redact: ["req.headers.authorization", "req.headers.cookie", "req.body.password"]
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError) {
      reply.status(error.statusCode).send(errorResponse(error));
      return;
    }

    if (error.validation) {
      reply.status(400).send(
        errorResponse(new ApiError(400, "VALIDATION_ERROR", "Invalid request", { issues: error.validation }))
      );
      return;
    }

    app.log.error({ err: error }, "Unhandled error");
    reply.status(500).send(errorResponse(new ApiError(500, "INTERNAL_ERROR", "Unexpected error")));
  });

  app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  });

  app.register(cors, {
    origin: env.CORS_ORIGIN.split(","),
    credentials: true
  });

  app.register(cookie, {
    secret: env.JWT_REFRESH_SECRET,
    hook: "onRequest",
    parseOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureCookie,
      path: "/"
    }
  });

  app.register(rateLimit, {
    max: Number(env.RATE_LIMIT_MAX),
    timeWindow: env.RATE_LIMIT_WINDOW
  });

  app.register(healthRoutes, { prefix: "/health" });
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(chatRoutes, { prefix: "/api/chats" });
  app.register(messageRoutes, { prefix: "/api/messages" });

  registerSocket(app);

  return app;
};
