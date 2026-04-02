import { createServer } from "http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import chatRoutes from "./routes/chatRoutes.js";
import { env } from "./config/env.js";
import { createMessage } from "./controllers/chatService.js";
import { prisma } from "./lib/prisma.js";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [env.frontendUrl],
    credentials: true
  }
});

app.use(
  cors({
    origin: [env.frontendUrl],
    credentials: true
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use("/api", chatRoutes);

const onlineUsers = new Map();

function setUserOnline(userId, socketId) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
}

function setUserOffline(userId, socketId) {
  const sockets = onlineUsers.get(userId);
  if (!sockets) return;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineUsers.delete(userId);
  }
}

io.on("connection", (socket) => {
  const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;

  if (!userId) {
    socket.disconnect(true);
    return;
  }

  socket.data.userId = userId;
  socket.join(`user:${userId}`);
  setUserOnline(userId, socket.id);

  io.emit("user:status", {
    userId,
    isOnline: true
  });

  socket.on("message:send", async (payload, callback) => {
    try {
      const { receiverId, content, type, attachmentUrl, attachmentName, attachmentSize } = payload;
      if (!receiverId || (!content?.trim() && !attachmentUrl)) {
        callback?.({ ok: false, error: "Invalid payload" });
        return;
      }

      const message = await createMessage({
        senderId: userId,
        receiverId,
        content: content?.trim() || attachmentName || "Attachment shared",
        type,
        attachmentUrl,
        attachmentName,
        attachmentSize
      });

      io.to(`user:${userId}`).to(`user:${receiverId}`).emit("message:new", message);
      io.to(`user:${receiverId}`).emit("conversation:updated", {
        conversationId: message.conversationId
      });

      const [sender, receiver] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true } }),
        prisma.user.findUnique({ where: { id: receiverId }, select: { role: true, name: true } })
      ]);

      if (sender?.role === "CUSTOMER" && receiver?.role === "SUPPORT") {
        const autoReply = await createMessage({
          senderId: receiverId,
          receiverId: userId,
          content: "Thanks for reaching out. Our support team received your message and will reply soon.",
          type: "SYSTEM"
        });
        io.to(`user:${userId}`).emit("message:new", autoReply);
      }

      callback?.({ ok: true, message });
    } catch (error) {
      callback?.({ ok: false, error: "Message send failed" });
    }
  });

  socket.on("typing:start", ({ toUserId, conversationId }) => {
    if (!toUserId || !conversationId) return;
    io.to(`user:${toUserId}`).emit("typing:update", {
      conversationId,
      fromUserId: userId,
      isTyping: true
    });
  });

  socket.on("typing:stop", ({ toUserId, conversationId }) => {
    if (!toUserId || !conversationId) return;
    io.to(`user:${toUserId}`).emit("typing:update", {
      conversationId,
      fromUserId: userId,
      isTyping: false
    });
  });

  socket.on("disconnect", () => {
    setUserOffline(userId, socket.id);
    const stillOnline = onlineUsers.has(userId);

    if (!stillOnline) {
      io.emit("user:status", {
        userId,
        isOnline: false
      });
    }
  });
});

httpServer.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
