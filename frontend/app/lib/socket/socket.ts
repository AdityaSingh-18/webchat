import { io } from "socket.io-client";

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

if (!socketUrl) {
  throw new Error("Missing NEXT_PUBLIC_SOCKET_URL");
}

export const createSocket = (accessToken: string) => {
  return io(socketUrl, {
    autoConnect: false,
    auth: {
      accessToken,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
};