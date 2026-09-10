import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import { rag1 } from "../ragWorking/qdrant.js";
import { evaluateAndOrchestrate } from "../ragWorking/psuedoGraph.js";

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

    const { text, jurisdiction } = req.body;
    const activeJurisdiction = jurisdiction;

    // Save user's message
    const userMessage = await prisma.message.create({
      data: {
        chatId,
        role: "user",
        content: text,
        jurisdiction: activeJurisdiction,
      },
    });

    // Fetch up to 10 previous messages from this chat for conversational context
    const rawHistory = await prisma.message.findMany({
      where: {
        chatId,
        id: { not: userMessage.id },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const conversationHistory = rawHistory.reverse().map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Evaluate conversation: decide whether to ask clarifying questions or answer
    const decision = await evaluateAndOrchestrate(
      text,
      conversationHistory,
      activeJurisdiction || "india"
    );

    let assistantContent = "";
    let assistantType: "clarification" | "answer" = "answer";
    let assistantConfidence: string = "high";
    let assistantCitations: any = null;

    if (decision.action === "ask" && decision.content) {
      // Natural clarifying questions generated following the minimum-questions rule
      assistantContent = decision.content;
      assistantType = "clarification";
      assistantConfidence = "high";
      assistantCitations = null;
    } else {
      // Enough information provided: run RAG with synthesized query and history context
      const queryToSearch = decision.searchQuery || text;
      const ragResponse: any = await rag1(queryToSearch, conversationHistory);

      assistantContent = ragResponse.content || "Unable to generate patentability analysis.";
      assistantType = "answer";
      assistantConfidence = typeof ragResponse.confidence === "number"
        ? (ragResponse.confidence >= 0.7 ? "high" : ragResponse.confidence >= 0.4 ? "medium" : "low")
        : (ragResponse.confidence || "medium");
      assistantCitations = ragResponse.citations || null;
    }

    const assistantMessage = await prisma.message.create({
      data: {
        chatId,
        role: "assistant",
        type: assistantType,
        content: assistantContent,
        confidence: assistantConfidence,
        citations: assistantCitations,
        jurisdiction: activeJurisdiction,
      },
    });

    res.status(201).json({
      userMessage,
      assistantMessage,
      answer: assistantMessage.content,
      type: assistantMessage.type,
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