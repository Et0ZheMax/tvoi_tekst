import { FastifyRequest } from "fastify";
import { ApiError } from "./errors.js";
import { verifyAccessToken } from "./auth.js";

export type AuthUser = {
  id: string;
  sessionId: string;
};

export const requireAuth = async (request: FastifyRequest) => {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    throw new ApiError(401, "UNAUTHORIZED", "Missing authorization header");
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid authorization header");
  }

  try {
    const payload = verifyAccessToken(token);
    request.user = { id: payload.sub, sessionId: payload.sessionId };
  } catch (error) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}
