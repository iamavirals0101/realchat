import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  { name: "Ava Support", email: "ava.support@example.com", role: "SUPPORT", avatar: "https://i.pravatar.cc/100?img=47" },
  { name: "Rohan Executive", email: "rohan.support@example.com", role: "SUPPORT", avatar: "https://i.pravatar.cc/100?img=13" },
  { name: "Alex Johnson", email: "alex@example.com", role: "CUSTOMER", avatar: "https://i.pravatar.cc/100?img=12" },
  { name: "Priya Shah", email: "priya@example.com", role: "CUSTOMER", avatar: "https://i.pravatar.cc/100?img=5" },
  { name: "Sam Wilson", email: "sam@example.com", role: "CUSTOMER", avatar: "https://i.pravatar.cc/100?img=20" }
];

async function main() {
  await prisma.internalNote.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();

  const createdUsers = [];
  for (const user of users) {
    const created = await prisma.user.create({ data: user });
    createdUsers.push(created);
  }

  const [support1, support2, customer1, customer2, customer3] = createdUsers;

  const conv1 = await prisma.conversation.create({ data: {} });
  await prisma.conversationParticipant.createMany({
    data: [
      { conversationId: conv1.id, userId: support1.id },
      { conversationId: conv1.id, userId: customer1.id }
    ]
  });

  const conv2 = await prisma.conversation.create({ data: {} });
  await prisma.conversationParticipant.createMany({
    data: [
      { conversationId: conv2.id, userId: support1.id },
      { conversationId: conv2.id, userId: customer2.id }
    ]
  });

  const conv3 = await prisma.conversation.create({ data: {} });
  await prisma.conversationParticipant.createMany({
    data: [
      { conversationId: conv3.id, userId: support2.id },
      { conversationId: conv3.id, userId: customer3.id }
    ]
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv1.id,
        senderId: customer1.id,
        receiverId: support1.id,
        content: "Hi, I need help with my billing invoice."
      },
      {
        conversationId: conv1.id,
        senderId: support1.id,
        receiverId: customer1.id,
        content: "Sure, I can help. Please share your invoice number."
      },
      {
        conversationId: conv2.id,
        senderId: customer2.id,
        receiverId: support1.id,
        content: "My account login keeps failing after password reset."
      },
      {
        conversationId: conv3.id,
        senderId: support2.id,
        receiverId: customer3.id,
        content: "Hello Sam, following up on your shipping delay ticket."
      }
    ]
  });

  await prisma.conversation.update({
    where: { id: conv1.id },
    data: {
      subject: "Billing issue: invoice mismatch",
      status: "OPEN",
      priority: "HIGH",
      tags: JSON.stringify(["billing", "invoice"]),
      assignedSupportId: support1.id,
      slaDueAt: new Date(Date.now() + 4 * 60 * 60 * 1000)
    }
  });

  await prisma.conversation.update({
    where: { id: conv2.id },
    data: {
      subject: "Login failure after reset",
      status: "PENDING",
      priority: "URGENT",
      tags: JSON.stringify(["auth", "login"]),
      assignedSupportId: support1.id,
      firstResponseAt: new Date(),
      slaDueAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    }
  });

  await prisma.conversation.update({
    where: { id: conv3.id },
    data: {
      subject: "Shipping delay follow-up",
      status: "RESOLVED",
      priority: "MEDIUM",
      tags: JSON.stringify(["shipping"]),
      assignedSupportId: support2.id,
      firstResponseAt: new Date(),
      resolvedAt: new Date(),
      csatRating: 4,
      csatComment: "Quick support response."
    }
  });

  await prisma.internalNote.create({
    data: {
      conversationId: conv1.id,
      authorId: support1.id,
      content: "Customer is frustrated. Prioritize invoice correction before EOD."
    }
  });

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
