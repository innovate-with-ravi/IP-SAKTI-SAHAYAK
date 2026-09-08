import crypto from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_DAYS = 7;

export async function createUser(
  email: string,
  password: string,
  name?: string
) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("USER_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  return prisma.user.create({
    data: {
      email,
      passwordHash,
      name: name ?? null,
      emailVerified: false,
    },
  });
}


export async function createRefreshToken(userId: string) {
  const token = crypto.randomBytes(64).toString("hex");

  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() + REFRESH_TOKEN_DAYS
  );

  return prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
}

export async function findValidRefreshToken(
  token: string
) {
  const refreshToken =
    await prisma.refreshToken.findUnique({
      where: { token },
    });

  if (!refreshToken) {
    return null;
  }

  if (refreshToken.revoked) {
    return null;
  }

  if (refreshToken.expiresAt < new Date()) {
    return null;
  }

  return refreshToken;
}

export async function revokeRefreshToken(
  token: string
) {
  return prisma.refreshToken.updateMany({
    where: { token },
    data: {
      revoked: true,
    },
  });
}

export async function findUserById(
  userId: string
) {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function verifyPassword(
  password: string,
  passwordHash: string
) {
  return bcrypt.compare(password, passwordHash);
}

export async function markEmailVerified(email: string) {
  return prisma.user.update({
    where: { email },
    data: {
      emailVerified: true,
    },
  });
}

export async function updatePassword(
  userId: string,
  newPassword: string
) {
  const passwordHash = await bcrypt.hash(
    newPassword,
    SALT_ROUNDS
  );

  return prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
    },
  });
}