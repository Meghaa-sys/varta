import http from "http";
import { Server } from "socket.io";
import { app } from "./app";
import { allowedOrigins, env } from "./config/env";
import { prisma } from "./config/prisma";
import { registerSocketServer } from "./realtime/socket";

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

registerSocketServer(io);

httpServer.listen(env.PORT, () => {
  console.log(`API and realtime server listening on port ${env.PORT}`);
});

const shutdown = async () => {
  console.log("Shutting down server...");
  io.close();
  httpServer.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
