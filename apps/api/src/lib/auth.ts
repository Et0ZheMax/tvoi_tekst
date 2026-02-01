import jwt from "jsonwebtoken";
import argon2 from "argon2";
import { env } from "../config.js";

export type JwtPayload = {
  sub: string;
  sessionId: string;
};

export const hashPassword = (password: string) => argon2.hash(password);
export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);

export const signAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL });

export const signRefreshToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.REFRESH_TOKEN_TTL });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
