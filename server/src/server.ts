import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { Server } from "socket.io";

import { env } from "./config/env";
import { supabase } from "./lib/supabase";

const app = Fastify({
  logger: true,
});

const start = async () => {
  try {
    await app.register(helmet);

    await app.register(cors, {
      origin: env.FRONTEND_URL,
    });

    await app.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute",
    });

    app.get("/health", async () => {
      return {
        status: "ok",
        service: "webchat-server",
      };
    });

    const io = new Server(app.server, {
      cors: {
        origin: env.FRONTEND_URL,
        methods: ["GET", "POST"],
      },
    });

    io.use(async (socket, next) => {
      try {
        const accessToken = socket.handshake.auth?.accessToken;

        if (!accessToken || typeof accessToken !== "string") {
          return next(new Error("Authentication required"));
        }

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(accessToken);

        if (error || !user) {
          return next(new Error("Invalid authentication token"));
        }

        socket.data.userId = user.id;
        socket.data.user = user;

        next();
      } catch {
        next(new Error("Socket authentication failed"));
      }
    });

    io.on("connection", (socket) => {
      app.log.info(
        `Authenticated socket connected: ${socket.data.userId} (${socket.id})`
      );

      socket.on("disconnect", (reason) => {
        app.log.info(
          `Socket disconnected: ${socket.data.userId} (${socket.id}) - ${reason}`
        );
      });
    });

    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();