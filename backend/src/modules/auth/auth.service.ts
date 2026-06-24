import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { ApiError } from "../../utils/api-error";
import { publicUserSelect } from "../users/user.select";
import type { LoginInput, PreferencesInput, RegisterInput } from "./auth.schemas";

const signToken = (userId: string) => {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  };

  return jwt.sign({ userId }, env.JWT_SECRET, options);
};

export const registerUser = async (input: RegisterInput) => {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.email }, { username: input.username }]
    }
  });

  if (existing) {
    throw new ApiError(409, "A user with that email or username already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      passwordHash,
      preferredLanguage: input.preferredLanguage
    },
    select: publicUserSelect
  });

  return {
    user,
    token: signToken(user.id)
  };
};

export const loginUser = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  const publicUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: publicUserSelect
  });

  return {
    user: publicUser,
    token: signToken(user.id)
  };
};

export const getCurrentUser = async (userId: string) =>
  prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: publicUserSelect
  });

export const updatePreferences = async (userId: string, input: PreferencesInput) =>
  prisma.user.update({
    where: { id: userId },
    data: input,
    select: publicUserSelect
  });

export const updateAvatar = async (userId: string, avatar: string) =>
  prisma.user.update({
    where: { id: userId },
    data: { avatar },
    select: publicUserSelect
  });
