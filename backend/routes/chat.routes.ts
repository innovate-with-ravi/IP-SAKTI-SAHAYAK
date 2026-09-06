import { Router } from "express";
import {
  createChat,
  listChats,
  getChatById,
  updateChatTitle,
  deleteChat,
  getChatMessages,
  sendMessage,
  deleteMessage,
} from "../controllers/chat.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { checkChatOwnership } from "../middleware/ownership.middleware.js";

const router = Router();

// All chat routes require authentication
router.use(requireAuth);

// Chat routes
router.post("/", createChat);
router.get("/", listChats);
router.get("/:id", checkChatOwnership, getChatById);
router.patch("/:id", checkChatOwnership, updateChatTitle);
router.delete("/:id", checkChatOwnership, deleteChat);

// Messages routes
router.get("/:id/messages", checkChatOwnership, getChatMessages);
router.post("/:id/messages", checkChatOwnership, sendMessage);
router.delete("/:chatId/messages/:messageId", checkChatOwnership, deleteMessage);

export default router;
