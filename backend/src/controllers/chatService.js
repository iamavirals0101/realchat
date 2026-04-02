import { prisma } from "../lib/prisma.js";

export async function getOrCreateConversation(senderId, receiverId) {
  const users = await prisma.user.findMany({
    where: { id: { in: [senderId, receiverId] } },
    select: { id: true, role: true }
  });

  if (users.length !== 2) {
    throw new Error("Invalid users for conversation");
  }

  const [a, b] = users;
  if (a.role === b.role) {
    throw new Error("Conversation must be between customer and support");
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      participants: {
        every: {
          userId: { in: [senderId, receiverId] }
        }
      },
      AND: [
        { participants: { some: { userId: senderId } } },
        { participants: { some: { userId: receiverId } } }
      ]
    },
    include: { participants: true }
  });

  if (existing && existing.participants.length === 2) {
    return existing;
  }

  const supportUser = users.find((user) => user.role === "SUPPORT");

  const conversation = await prisma.conversation.create({ data: {} });
  await prisma.conversationParticipant.createMany({
    data: [
      { conversationId: conversation.id, userId: senderId },
      { conversationId: conversation.id, userId: receiverId }
    ]
  });

  if (supportUser) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        assignedSupportId: supportUser.id,
        slaDueAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
      }
    });
  }

  return conversation;
}

export async function createMessage({
  senderId,
  receiverId,
  content,
  type = "TEXT",
  attachmentUrl = null,
  attachmentName = null,
  attachmentSize = null
}) {
  const conversation = await getOrCreateConversation(senderId, receiverId);
  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { role: true } });
  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { role: true } });

  const message = await prisma.message.create({
    data: {
      senderId,
      receiverId,
      content,
      conversationId: conversation.id,
      type,
      attachmentUrl,
      attachmentName,
      attachmentSize,
      deliveredAt: new Date()
    },
    include: {
      sender: { select: { id: true, name: true, avatar: true } },
      receiver: { select: { id: true, name: true, avatar: true } }
    }
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() }
  });

  if (sender?.role === "SUPPORT") {
    await prisma.conversation.updateMany({
      where: { id: conversation.id, firstResponseAt: null },
      data: { firstResponseAt: new Date(), status: "PENDING" }
    });
  }

  if (sender?.role === "CUSTOMER" && receiver?.role === "SUPPORT") {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: "OPEN" }
    });
  }

  await prisma.conversationParticipant.updateMany({
    where: { conversationId: conversation.id, userId: receiverId },
    data: { unreadCount: { increment: 1 } }
  });

  return message;
}

export async function updateTicket(conversationId, data) {
  const { status, priority, tags, assignedSupportId, slaDueAt } = data;
  const payload = {};

  if (status) payload.status = status;
  if (priority) payload.priority = priority;
  if (Array.isArray(tags)) payload.tags = JSON.stringify(tags);
  if (assignedSupportId !== undefined) payload.assignedSupportId = assignedSupportId || null;
  if (slaDueAt !== undefined) payload.slaDueAt = slaDueAt ? new Date(slaDueAt) : null;

  if (status === "RESOLVED") payload.resolvedAt = new Date();
  if (status === "CLOSED") payload.closedAt = new Date();

  return prisma.conversation.update({
    where: { id: conversationId },
    data: payload,
    include: {
      assignedSupport: { select: { id: true, name: true, role: true } }
    }
  });
}
