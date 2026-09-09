import type { Request, Response } from "express";
import { prisma } from "../config/db.js";

// ==========================================
// Helpers
// ==========================================

const getParamString = (val: string | string[] | undefined): string | null => {
  if (!val) return null;
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
};

// ==========================================
// Controller Handlers
// ==========================================

/**
 * POST /api/chats
 * Create a new chat for the authenticated user
 */
export const createChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { title } = req.body;

    const chat = await prisma.chat.create({
      data: {
        userId,
        title: title || "New Chat",
      },
    });

    res.status(201).json(chat);
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ error: "Failed to create chat" });
  }
};

/**
 * GET /api/chats
 * List all chats for the authenticated user (with pagination)
 */
export const listChats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const [chats, total] = await Promise.all([
      prisma.chat.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: { messages: true },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              role: true,
              content: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.chat.count({
        where: { userId },
      }),
    ]);

    res.json({
      chats,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + chats.length < total,
      },
    });
  } catch (error) {
    console.error("Error listing chats:", error);
    res.status(500).json({ error: "Failed to list chats" });
  }
};

/**
 * GET /api/chats/:id
 * Get a specific chat and its full message history
 */
export const getChatById = async (req: Request, res: Response): Promise<void> => {
  try {
    const chatId = getParamString(req.params.id) ?? getParamString(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "Chat ID is required" });
      return;
    }

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!chat) {
      res.status(404).json({ error: "Chat not found" });
      return;
    }

    res.json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    res.status(500).json({ error: "Failed to fetch chat" });
  }
};

/**
 * PATCH /api/chats/:id
 * Update a chat's title
 */
export const updateChatTitle = async (req: Request, res: Response): Promise<void> => {
  try {
    const chatId = getParamString(req.params.id) ?? getParamString(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "Chat ID is required" });
      return;
    }

    const { title } = req.body;

    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        title,
      },
    });

    res.json(updatedChat);
  } catch (error) {
    console.error("Error updating chat title:", error);
    res.status(500).json({ error: "Failed to update chat title" });
  }
};

/**
 * DELETE /api/chats/:id
 * Delete a chat and all its associated messages
 */
export const deleteChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const chatId = getParamString(req.params.id) ?? getParamString(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "Chat ID is required" });
      return;
    }

    await prisma.message.deleteMany({
      where: { chatId },
    });

    await prisma.chat.delete({
      where: { id: chatId },
    });

    res.json({
      message: "Chat deleted successfully",
      chatId,
    });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ error: "Failed to delete chat" });
  }
};