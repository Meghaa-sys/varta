import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";
import { asyncHandler } from "../utils/async-handler";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  preferredLanguage: string;
  autoTranslateEnabled: boolean;
  regionalSlangMode: boolean;
};

type JwtPayload = {
  userId: string;
};

const extractToken = (header?: string) => {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
};

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req.headers.authorization);

  if (!token) {
    throw new ApiError(401, "Authentication token is required");
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      username: true,
      email: true,
      preferredLanguage: true,
      autoTranslateEnabled: true,
      regionalSlangMode: true
    }
  });

  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }

  req.user = user;
  next();
});
