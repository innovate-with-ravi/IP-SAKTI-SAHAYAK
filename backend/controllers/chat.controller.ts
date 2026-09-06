import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/db.js";

const getParamString = (val: string | string[] | undefined): string | null => {
  if (!val) return null;
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
};

const createChatSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
});

const updateChatSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty").max(255, "Title is too long"),
});

const sendMessageSchema = z.object({
  text: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).optional(),
}).refine(data => Boolean(data.text || data.content), {
  message: "Either 'text' or 'content' must be provided",
});

/**
 * POST /chats
 * Create a new chat for the authenticated user
 */
export const createChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const parseResult = createChatSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Validation error", details: parseResult.error.flatten() });
      return;
    }

    const title = parseResult.data.title || "New Chat";

    const chat = await prisma.chat.create({
      data: {
        userId,
        title,
      },
    });

    res.status(201).json(chat);
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ error: "Failed to create chat" });
  }
};

/**
 * GET /chats
 * List all chats for the authenticated user
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
          _count: { select: { messages: true } },
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
      prisma.chat.count({ where: { userId } }),
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
 * GET /chats/:id
 * Get a specific chat and its full message history (ownership verified by middleware)
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
 * PATCH /chats/:id
 * Update the title of a chat (ownership verified by middleware)
 */
export const updateChatTitle = async (req: Request, res: Response): Promise<void> => {
  try {
    const chatId = getParamString(req.params.id) ?? getParamString(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "Chat ID is required" });
      return;
    }

    const parseResult = updateChatSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Validation error", details: parseResult.error.flatten() });
      return;
    }

    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: { title: parseResult.data.title },
    });

    res.json(updatedChat);
  } catch (error) {
    console.error("Error updating chat title:", error);
    res.status(500).json({ error: "Failed to update chat title" });
  }
};

/**
 * DELETE /chats/:id
 * Delete a chat and its messages (ownership verified by middleware)
 */
export const deleteChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const chatId = getParamString(req.params.id) ?? getParamString(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "Chat ID is required" });
      return;
    }

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { chatId } }),
      prisma.chat.delete({ where: { id: chatId } }),
    ]);

    res.json({ message: "Chat deleted successfully", chatId });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ error: "Failed to delete chat" });
  }
};

/**
 * GET /chats/:id/messages
 * Get all messages for a specific chat (ownership verified by middleware)
 */
export const getChatMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const chatId = getParamString(req.params.id) ?? getParamString(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "Chat ID is required" });
      return;
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
    });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
};

/**
 * POST /chats/:id/messages
 * Create a new message in the chat (ownership verified by middleware)
 * Stage 2 persists the user message and creates a placeholder response.
 * (Full AI retrieval pipeline from section 3 will be wired in Stage 4)
 */
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const chatId = getParamString(req.params.id) ?? getParamString(req.params.chatId);
    if (!chatId) {
      res.status(400).json({ error: "Chat ID is required" });
      return;
    }

    const parseResult = sendMessageSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: "Validation error", details: parseResult.error.flatten() });
      return;
    }

    const text = parseResult.data.text || parseResult.data.content || "";

    // 1. Save user message to database
    const userMessage = await prisma.message.create({
      data: {
        chatId,
        role: "user",
        content: text,
      },
    });

    // 2. Stage 2 Mock/Placeholder Assistant Message (per Section 4 Step 9 spec)
    // external microservices (Qdrant, Graph, LLM, Bhashini) will be plugged in at Stage 4.
    const assistantMessage = await prisma.message.create({
      data: {
        chatId,
        role: "assistant",
        content: `Stage 2 Acknowledgement: Received inquiry "${text}". The multi-track AI retrieval pipeline (Qdrant vector search + Graph cross-refs + LLM generation) will be wired in Stage 4.`,
        citations: [
          {
            source: "Ayurvedic Formulary of India (AFI)",
            header_path: ["Classical Formulations"],
            note: "Mock citation for Stage 2 contract verification",
          },
        ],
        confidence: "medium",
        jurisdiction: "india",
      },
    });

    res.status(201).json({
      userMessage,
      assistantMessage,
      answer: assistantMessage.content,
      citations: assistantMessage.citations,
      confidence: assistantMessage.confidence,
      disclaimer: "This is informational only, not legal advice.",
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

/**
 * DELETE /chats/:chatId/messages/:messageId
 * Delete a specific message within a chat
 */
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const chatId = getParamString(req.params.chatId) ?? getParamString(req.params.id);
    const messageId = getParamString(req.params.messageId);

    if (!chatId) {
      res.status(400).json({ error: "Chat ID is required" });
      return;
    }

    if (!messageId) {
      res.status(400).json({ error: "Message ID is required" });
      return;
    }

    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        chatId,
      },
    });

    if (!message) {
      res.status(404).json({ error: "Message not found in this chat" });
      return;
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    res.json({ message: "Message deleted successfully", messageId });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
};
