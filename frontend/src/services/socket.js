import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export function connectSocket(userId) {
  return io(SOCKET_URL, {
    transports: ["websocket"],
    auth: { userId }
  });
}
