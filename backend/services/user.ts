import { prisma } from "../config/db.js";

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });
}

export async function updateUser(
  userId: string,
  data: {
    name?: string;
  }
) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });
}