import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/api-error";

type ContactStatus = "PENDING" | "ACCEPTED";

type ContactRow = {
  id: string;
  status: ContactStatus;
  requesterId: string;
  addresseeId: string;
  createdAt: Date;
  updatedAt: Date;
  contactUserId: string;
  username: string;
  email: string;
  avatar: string | null;
  preferredLanguage: string;
  autoTranslateEnabled: boolean;
  regionalSlangMode: boolean;
  isOnline: boolean;
  lastSeen: Date | null;
  userCreatedAt: Date;
};

const shapeContact = (contact: ContactRow, viewerId: string) => {
  const direction = contact.requesterId === viewerId ? "outgoing" : "incoming";

  return {
    id: contact.id,
    status: contact.status,
    direction,
    contactUser: {
      id: contact.contactUserId,
      username: contact.username,
      email: contact.email,
      avatar: contact.avatar,
      preferredLanguage: contact.preferredLanguage,
      autoTranslateEnabled: contact.autoTranslateEnabled,
      regionalSlangMode: contact.regionalSlangMode,
      isOnline: contact.isOnline,
      lastSeen: contact.lastSeen,
      createdAt: contact.userCreatedAt
    },
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt
  };
};

const findContactRowsForViewer = (viewerId: string) => prisma.$queryRaw<ContactRow[]>`
  SELECT
    c."id",
    c."status"::text AS "status",
    c."requesterId",
    c."addresseeId",
    c."createdAt",
    c."updatedAt",
    u."id" AS "contactUserId",
    u."username",
    u."email",
    u."avatar",
    u."preferredLanguage",
    u."autoTranslateEnabled",
    u."regionalSlangMode",
    u."isOnline",
    u."lastSeen",
    u."createdAt" AS "userCreatedAt"
  FROM "Contact" c
  JOIN "User" u ON u."id" = CASE
    WHEN c."requesterId" = ${viewerId} THEN c."addresseeId"
    ELSE c."requesterId"
  END
  WHERE c."requesterId" = ${viewerId} OR c."addresseeId" = ${viewerId}
  ORDER BY c."status" ASC, c."updatedAt" DESC
`;

const findContactByIdForViewer = async (contactId: string, viewerId: string) => {
  const rows = await prisma.$queryRaw<ContactRow[]>`
    SELECT
      c."id",
      c."status"::text AS "status",
      c."requesterId",
      c."addresseeId",
      c."createdAt",
      c."updatedAt",
      u."id" AS "contactUserId",
      u."username",
      u."email",
      u."avatar",
      u."preferredLanguage",
      u."autoTranslateEnabled",
      u."regionalSlangMode",
      u."isOnline",
      u."lastSeen",
      u."createdAt" AS "userCreatedAt"
    FROM "Contact" c
    JOIN "User" u ON u."id" = CASE
      WHEN c."requesterId" = ${viewerId} THEN c."addresseeId"
      ELSE c."requesterId"
    END
    WHERE c."id" = ${contactId}
      AND (c."requesterId" = ${viewerId} OR c."addresseeId" = ${viewerId})
    LIMIT 1
  `;

  return rows[0] ?? null;
};

const findContactBetweenUsers = async (viewerId: string, otherUserId: string) => {
  const rows = await prisma.$queryRaw<ContactRow[]>`
    SELECT
      c."id",
      c."status"::text AS "status",
      c."requesterId",
      c."addresseeId",
      c."createdAt",
      c."updatedAt",
      u."id" AS "contactUserId",
      u."username",
      u."email",
      u."avatar",
      u."preferredLanguage",
      u."autoTranslateEnabled",
      u."regionalSlangMode",
      u."isOnline",
      u."lastSeen",
      u."createdAt" AS "userCreatedAt"
    FROM "Contact" c
    JOIN "User" u ON u."id" = CASE
      WHEN c."requesterId" = ${viewerId} THEN c."addresseeId"
      ELSE c."requesterId"
    END
    WHERE (c."requesterId" = ${viewerId} AND c."addresseeId" = ${otherUserId})
      OR (c."requesterId" = ${otherUserId} AND c."addresseeId" = ${viewerId})
    LIMIT 1
  `;

  return rows[0] ?? null;
};

const createContactNotification = (userId: string, title: string, content: string) =>
  prisma.$executeRaw`
    INSERT INTO "Notification" ("id", "userId", "title", "content", "type")
    VALUES (${randomUUID()}, ${userId}, ${title}, ${content}, CAST('CONTACT_REQUEST' AS "NotificationType"))
  `;

export const listContacts = async (userId: string) => {
  const contacts = await findContactRowsForViewer(userId);
  return contacts.map((contact) => shapeContact(contact, userId));
};

export const requestContact = async (requesterId: string, addresseeId: string) => {
  if (requesterId === addresseeId) {
    throw new ApiError(400, "You cannot add yourself as a contact");
  }

  const [requester, addressee] = await Promise.all([
    prisma.user.findUnique({ where: { id: requesterId }, select: { username: true } }),
    prisma.user.findUnique({ where: { id: addresseeId }, select: { id: true } })
  ]);

  if (!requester || !addressee) {
    throw new ApiError(404, "User not found");
  }

  const existing = await findContactBetweenUsers(requesterId, addresseeId);

  if (existing) {
    if (existing.status === "PENDING" && existing.addresseeId === requesterId) {
      await prisma.$executeRaw`
        UPDATE "Contact"
        SET "status" = 'ACCEPTED', "updatedAt" = NOW()
        WHERE "id" = ${existing.id}
      `;

      const accepted = await findContactByIdForViewer(existing.id, requesterId);
      await createContactNotification(
        existing.requesterId,
        "Contact accepted",
        `${requester.username} accepted your contact request`
      );

      if (!accepted) throw new ApiError(404, "Contact request not found");
      return shapeContact(accepted, requesterId);
    }

    return shapeContact(existing, requesterId);
  }

  const contactId = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "Contact" ("id", "requesterId", "addresseeId", "updatedAt")
    VALUES (${contactId}, ${requesterId}, ${addresseeId}, NOW())
  `;

  await createContactNotification(
    addresseeId,
    "Contact request",
    `${requester.username} wants to add you as a contact`
  );

  const contact = await findContactByIdForViewer(contactId, requesterId);
  if (!contact) throw new ApiError(404, "Contact request not found");

  return shapeContact(contact, requesterId);
};

export const acceptContact = async (contactId: string, userId: string) => {
  const contact = await findContactByIdForViewer(contactId, userId);

  if (!contact || contact.addresseeId !== userId) {
    throw new ApiError(404, "Contact request not found");
  }

  await prisma.$executeRaw`
    UPDATE "Contact"
    SET "status" = 'ACCEPTED', "updatedAt" = NOW()
    WHERE "id" = ${contactId}
  `;

  await createContactNotification(
    contact.requesterId,
    "Contact accepted",
    `${contact.username} accepted your contact request`
  );

  const accepted = await findContactByIdForViewer(contactId, userId);
  if (!accepted) throw new ApiError(404, "Contact request not found");

  return shapeContact(accepted, userId);
};

export const removeContact = async (contactId: string, userId: string) => {
  const removed = await prisma.$executeRaw`
    DELETE FROM "Contact"
    WHERE "id" = ${contactId}
      AND ("requesterId" = ${userId} OR "addresseeId" = ${userId})
  `;

  if (removed === 0) {
    throw new ApiError(404, "Contact not found");
  }
};
