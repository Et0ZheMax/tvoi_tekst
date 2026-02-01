import { FastifyInstance } from "fastify";

export const healthRoutes = async (app: FastifyInstance) => {
  app.get("/", async () => ({ status: "ok" }));
};
