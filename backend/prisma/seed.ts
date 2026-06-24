import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const users = await Promise.all(
    [
      { username: "megha", email: "megha@example.com", preferredLanguage: "en" },
      { username: "anjali", email: "anjali@example.com", preferredLanguage: "ml" },
      { username: "arjun", email: "arjun@example.com", preferredLanguage: "hi" }
    ].map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: {
          ...user,
          passwordHash,
          autoTranslateEnabled: true
        }
      })
    )
  );

  await prisma.contact.upsert({
    where: {
      requesterId_addresseeId: {
        requesterId: users[0].id,
        addresseeId: users[1].id
      }
    },
    update: { status: "ACCEPTED" },
    create: {
      requesterId: users[0].id,
      addresseeId: users[1].id,
      status: "ACCEPTED"
    }
  });

  await prisma.contact.upsert({
    where: {
      requesterId_addresseeId: {
        requesterId: users[2].id,
        addresseeId: users[0].id
      }
    },
    update: {},
    create: {
      requesterId: users[2].id,
      addresseeId: users[0].id,
      status: "PENDING"
    }
  });

  const existing = await prisma.conversation.findFirst({
    where: {
      type: "GROUP",
      name: "Global Standup"
    }
  });

  if (!existing) {
    await prisma.conversation.create({
      data: {
        type: "GROUP",
        name: "Global Standup",
        createdById: users[0].id,
        members: {
          create: users.map((user, index) => ({
            userId: user.id,
            role: index === 0 ? "OWNER" : "MEMBER"
          }))
        },
        messages: {
          create: {
            senderId: users[0].id,
            content: "Hey guys, meeting starts at 3 PM",
            originalLanguage: "en"
          }
        }
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

