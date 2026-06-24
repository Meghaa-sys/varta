import { prisma } from "../../config/prisma";
import { publicUserSelect } from "./user.select";

export const normalizeUserLookup = (value: string) => {
  const trimmed = value.trim();
  const profileMatch = trimmed.match(/\/u\/([^/?#]+)/i);
  const candidate = profileMatch?.[1] ?? trimmed;

  try {
    return decodeURIComponent(candidate).replace(/^@+/, "").trim();
  } catch {
    return candidate.replace(/^@+/, "").trim();
  }
};

export const searchUsers = async (viewerId: string, query: string) => {
  const normalized = normalizeUserLookup(query);

  if (normalized.length < 2) {
    return [];
  }

  return prisma.user.findMany({
    where: {
      id: { not: viewerId },
      OR: [
        { username: { equals: normalized, mode: "insensitive" } },
        { username: { contains: normalized, mode: "insensitive" } },
        { email: { contains: normalized, mode: "insensitive" } }
      ]
    },
    select: publicUserSelect,
    take: 20,
    orderBy: [{ username: "asc" }]
  });
};

export const getUserByUsername = async (username: string) => {
  const normalized = normalizeUserLookup(username);

  if (normalized.length < 2) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      username: {
        equals: normalized,
        mode: "insensitive"
      }
    },
    select: publicUserSelect
  });
};
