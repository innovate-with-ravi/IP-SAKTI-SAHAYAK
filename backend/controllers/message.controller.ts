import type { Request, Response } from "express";
import { prisma } from "../config/db.js";

const getParamString = (
  val: string | string[] | undefined
): string | null => {
  if (!val) return null;
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
};

// GET /api/chats/:chatId/messages
export const getChatMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const chatId = getParamString(req.params.chatId) ?? getParamString(req.params.id);

    if (!chatId) {
      res.status(400).json({
        error: "Chat ID is required",
      });
      return;
    }

    const messages = await prisma.message.findMany({
      where: {
        chatId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);

    res.status(500).json({
      error: "Failed to fetch chat messages",
    });
  }
};

// POST /api/chats/:chatId/messages
export const sendMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const chatId = getParamString(req.params.chatId) ?? getParamString(req.params.id);

    if (!chatId) {
      res.status(400).json({
        error: "Chat ID is required",
      });
      return;
    }

    const { text } = req.body;

    // Save user's message
    const userMessage = await prisma.message.create({
      data: {
        chatId,
        role: "user",
        content: text,
      },
    });

    /*
      TODO:
      1. Determine jurisdiction
      2. Bhashini translation
      3. Call Graph Team API
      4. Receive answer + citations + confidence
      5. Translate response if required
    */

    // Temporary assistant response
    const assistantMessage = await prisma.message.create({
      data: {
        chatId,
        role: "assistant",
        content: `Received: ${text}`,
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

    res.status(500).json({
      error: "Failed to send message",
    });
  }
};

// DELETE /api/chats/:chatId/messages/:messageId
export const deleteMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const chatId = getParamString(req.params.chatId) ?? getParamString(req.params.id);
    const messageId = getParamString(req.params.messageId);

    if (!chatId) {
      res.status(400).json({
        error: "Chat ID is required",
      });
      return;
    }

    if (!messageId) {
      res.status(400).json({
        error: "Message ID is required",
      });
      return;
    }

    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        chatId,
      },
    });

    if (!message) {
      res.status(404).json({
        error: "Message not found in this chat",
      });
      return;
    }

    await prisma.message.delete({
      where: {
        id: messageId,
      },
    });

    res.json({
      message: "Message deleted successfully",
      messageId,
    });
  } catch (error) {
    console.error("Error deleting message:", error);

    res.status(500).json({
      error: "Failed to delete message",
    });
  }
};