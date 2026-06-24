import { io, type Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

export const createSocket = (token: string): Socket =>
  io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"]
  });
