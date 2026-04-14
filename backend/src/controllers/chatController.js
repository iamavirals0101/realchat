import { prisma } from "../lib/prisma.js";
import { createMessage, updateTicket } from "./chatService.js";
import { uploadBufferToCloudinary } from "../lib/upload.js";

function parseTags(tagsRaw) {
  try {
    const parsed = JSON.parse(tagsRaw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function conversationView(conv, userId) {
  const selfParticipant = conv.participants.find((p) => p.userId === userId);
  const otherParticipant = conv.participants.find((p) => p.userId !== userId);
  const lastMessage = conv.messages[0] || null;

  return {
    id: conv.id,
    subject: conv.subject,
    status: conv.status,
    priority: conv.priority,
    tags: parseTags(conv.tags),
    assignedSupport: conv.assignedSupport,
    slaDueAt: conv.slaDueAt,
    resolvedAt: conv.resolvedAt,
    closedAt: conv.closedAt,
    firstResponseAt: conv.firstResponseAt,
    csatRating: conv.csatRating,
    csatComment: conv.csatComment,
    user: otherParticipant?.user,
    participantRole: otherParticipant?.user?.role || null,
    unreadCount: selfParticipant?.unreadCount || 0,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          content: lastMessage.content,
          timestamp: lastMessage.timestamp,
          senderName: lastMessage.sender.name,
          type: lastMessage.type
        }
      : null,
    updatedAt: conv.updatedAt
  };
}

export async function listUsers(req, res) {
  const role = req.query.role;
  const users = await prisma.user.findMany({
    where: role ? { role } : undefined,
    select: { id: true, name: true, email: true, avatar: true, role: true }
  });
  res.json(users);
}

export async function getConversations(req, res) {
  const { userId } = req;
  const { status, priority, assigned, unreadOnly, search, sort = "recent" } = req.query;

  const where = {
    participants: { some: { userId } }
  };

  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigned === "me") where.assignedSupportId = userId;
  if (search) {
    where.OR = [
      { subject: { contains: search } },
      { tags: { contains: search } },
      {
        participants: {
          some: {
            user: {
              name: { contains: search }
            }
          }
        }
      }
    ];
  }

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      assignedSupport: { select: { id: true, name: true, role: true } },
      participants: {
        include: { user: { select: { id: true, name: true, avatar: true, role: true } } }
      },
      messages: {
        orderBy: { timestamp: "desc" },
        take: 1,
        include: {
          sender: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: sort === "sla" ? { slaDueAt: "asc" } : { updatedAt: "desc" }
  });
  let mapped = conversations.map((conv) => conversationView(conv, userId));
  if (unreadOnly === "true") {
    mapped = mapped.filter((item) => item.unreadCount > 0);
  }
  res.json(mapped);
}

export async function getMessages(req, res) {
  const { conversationId } = req.params;
  const { userId } = req;
  const limit = Math.min(Number(req.query.limit || 20), 50);
  const cursor = req.query.cursor;

  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId
      }
    }
  });

  if (!participant) {
    return res.status(403).json({ error: "You are not a member of this conversation." });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { timestamp: "desc" },
    take: limit,
    ...(cursor
      ? {
          skip: 1,
          cursor: { id: cursor }
        }
      : {}),
    include: {
      sender: { select: { id: true, name: true, avatar: true, role: true } },
      receiver: { select: { id: true, name: true, avatar: true, role: true } }
    }
  });

  // Reset unread count only when loading the latest window (not while backfilling older pages).
  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId,
        userId
      }
    },
    data: { unreadCount: 0 }
  });

  const ordered = [...messages].reverse();
  const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;

  res.json({ messages: ordered, nextCursor });
}

export async function postMessage(req, res) {
  const { senderId, receiverId, content, type, attachmentUrl, attachmentName, attachmentSize } = req.body;

  if (!senderId || !receiverId || (!content?.trim() && !attachmentUrl)) {
    return res.status(400).json({ error: "senderId, receiverId and content or attachment is required." });
  }

  const message = await createMessage({
    senderId,
    receiverId,
    content: content?.trim() || attachmentName || "Attachment shared",
    type,
    attachmentUrl,
    attachmentName,
    attachmentSize
  });

  res.status(201).json(message);
}

export async function updateConversationTicket(req, res) {
  const { conversationId } = req.params;
  const updated = await updateTicket(conversationId, req.body);
  res.json({
    ...updated,
    tags: parseTags(updated.tags)
  });
}

export async function markConversationRead(req, res) {
  const { conversationId } = req.params;
  const { userId } = req;

  await prisma.message.updateMany({
    where: {
      conversationId,
      receiverId: userId,
      readAt: null
    },
    data: { readAt: new Date() }
  });

  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId },
    data: { unreadCount: 0 }
  });

  res.json({ ok: true });
}

export async function editMessage(req, res) {
  const { messageId } = req.params;
  const { userId } = req;
  const { content } = req.body;

  const existing = await prisma.message.findUnique({ where: { id: messageId } });
  if (!existing) return res.status(404).json({ error: "Message not found" });
  if (existing.senderId !== userId) return res.status(403).json({ error: "Only sender can edit message" });

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      content: content?.trim() || existing.content,
      editedAt: new Date()
    }
  });

  res.json(updated);
}

export async function deleteMessage(req, res) {
  const { messageId } = req.params;
  const { userId } = req;
  const existing = await prisma.message.findUnique({ where: { id: messageId } });
  if (!existing) return res.status(404).json({ error: "Message not found" });
  if (existing.senderId !== userId) return res.status(403).json({ error: "Only sender can delete message" });

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      content: "This message was removed.",
      deletedAt: new Date()
    }
  });
  res.json(updated);
}

export async function getConversationNotes(req, res) {
  const { conversationId } = req.params;
  const notes = await prisma.internalNote.findMany({
    where: { conversationId },
    include: {
      author: { select: { id: true, name: true, role: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  res.json(notes);
}

export async function addConversationNote(req, res) {
  const { conversationId } = req.params;
  const { userId } = req;
  const { content } = req.body;
  const author = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!author || author.role !== "SUPPORT") {
    return res.status(403).json({ error: "Only support users can add internal notes." });
  }
  const created = await prisma.internalNote.create({
    data: {
      conversationId,
      authorId: userId,
      content: content?.trim() || ""
    },
    include: {
      author: { select: { id: true, name: true, role: true } }
    }
  });
  res.status(201).json(created);
}

export async function getCannedReplies(_req, res) {
  const replies = [
    "Thanks for reaching out. I am checking this and will update you shortly.",
    "Can you share a screenshot so I can diagnose this quickly?",
    "I have escalated this to the technical team. You will get an update soon.",
    "This is now resolved from our side. Please confirm if it works for you."
  ];
  res.json(replies);
}

export async function getConversationSummary(req, res) {
  const { conversationId } = req.params;
  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: { select: { name: true } }
    },
    orderBy: { timestamp: "asc" },
    take: 30
  });
  const preview = messages.slice(-6).map((m) => `${m.sender.name}: ${m.content}`).join(" | ");
  res.json({
    conversationId,
    summary:
      preview ||
      "No conversation summary available yet. Once messages are exchanged, this section will show a quick recap."
  });
}

export async function getResponseEstimate(req, res) {
  const { conversationId } = req.params;
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { priority: true, status: true, slaDueAt: true }
  });
  if (!convo) return res.status(404).json({ error: "Conversation not found" });

  const baseMinutesByPriority = {
    LOW: 120,
    MEDIUM: 60,
    HIGH: 30,
    URGENT: 10
  };
  const etaMinutes = baseMinutesByPriority[convo.priority] || 60;
  const eta = new Date(Date.now() + etaMinutes * 60 * 1000);
  res.json({
    conversationId,
    etaMinutes,
    etaAt: eta,
    status: convo.status,
    slaDueAt: convo.slaDueAt
  });
}

export async function submitFeedback(req, res) {
  const { conversationId } = req.params;
  const { rating, comment } = req.body;
  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      csatRating: Number(rating),
      csatComment: comment?.trim() || null
    }
  });
  res.json({ id: updated.id, csatRating: updated.csatRating, csatComment: updated.csatComment });
}

export async function getAnalyticsOverview(_req, res) {
  const conversations = await prisma.conversation.findMany({
    include: {
      assignedSupport: { select: { id: true, name: true } },
      messages: {
        select: { senderId: true, timestamp: true }
      }
    }
  });

  const withFirstResponse = conversations.filter((c) => c.firstResponseAt);
  const withResolution = conversations.filter((c) => c.resolvedAt);
  const withCsat = conversations.filter((c) => typeof c.csatRating === "number");

  const avgFirstResponseMinutes =
    withFirstResponse.reduce((acc, c) => acc + (new Date(c.firstResponseAt) - new Date(c.createdAt)) / 60000, 0) /
      (withFirstResponse.length || 1);
  const avgResolutionMinutes =
    withResolution.reduce((acc, c) => acc + (new Date(c.resolvedAt) - new Date(c.createdAt)) / 60000, 0) /
      (withResolution.length || 1);
  const avgCsat = withCsat.reduce((acc, c) => acc + c.csatRating, 0) / (withCsat.length || 1);

  const dayVolume = new Map();
  for (const conv of conversations) {
    for (const message of conv.messages) {
      const key = new Date(message.timestamp).toISOString().slice(0, 10);
      dayVolume.set(key, (dayVolume.get(key) || 0) + 1);
    }
  }

  const agentMap = new Map();
  for (const conv of conversations) {
    if (!conv.assignedSupport) continue;
    const key = conv.assignedSupport.id;
    if (!agentMap.has(key)) {
      agentMap.set(key, {
        agentId: key,
        agentName: conv.assignedSupport.name,
        assignedCount: 0,
        resolvedCount: 0
      });
    }
    const item = agentMap.get(key);
    item.assignedCount += 1;
    if (conv.status === "RESOLVED" || conv.status === "CLOSED") item.resolvedCount += 1;
  }

  res.json({
    summary: {
      open: conversations.filter((c) => c.status === "OPEN").length,
      pending: conversations.filter((c) => c.status === "PENDING").length,
      resolved: conversations.filter((c) => c.status === "RESOLVED").length,
      closed: conversations.filter((c) => c.status === "CLOSED").length,
      avgFirstResponseMinutes: Number(avgFirstResponseMinutes.toFixed(1)),
      avgResolutionMinutes: Number(avgResolutionMinutes.toFixed(1)),
      avgCsat: Number(avgCsat.toFixed(2))
    },
    volumeByDay: Array.from(dayVolume.entries()).map(([date, count]) => ({ date, count })),
    agentPerformance: Array.from(agentMap.values())
  });
}

export async function uploadAttachment(req, res) {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  try {
    const uploaded = await uploadBufferToCloudinary(file);
    const isPdf = file.mimetype === "application/pdf";
    res.status(201).json({
      url: uploaded.secure_url,
      name: file.originalname,
      size: file.size,
      type: isPdf ? "FILE" : "IMAGE"
    });
  } catch (error) {
    res.status(500).json({ error: "File upload failed." });
  }
}
