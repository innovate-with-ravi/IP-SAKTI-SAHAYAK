import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db.js";

const getParamString = (val: string | string[] | undefined): string | null => {
  if (!val) return null;
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
};

export const checkChatOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const chatId = getParamString(req.params.id) ?? getParamString(req.params.chatId);

    if (!chatId) {
      res.status(400).json({ error: "Bad Request: Chat ID is required" });
      return;
    }

    const currentUserId = req.user?.id || req.user?.userId;
    if (!currentUserId) {
      res.status(401).json({ error: "Unauthorized: User not authenticated" });
      return;
    }

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    if (chat.userId !== currentUserId) {
      res.status(403).json({ error: "Forbidden: You do not own this chat" });
      return;
    }

    req.chat = chat;
    next();
  } catch (error) {
    console.error("Error checking chat ownership:", error);
    res.status(500).json({ error: "Internal server error checking chat ownership" });
  }
};
