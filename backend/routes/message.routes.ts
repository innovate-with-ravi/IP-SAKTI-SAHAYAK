import { Router } from "express";
import {
  getChatMessages,
  sendMessage,
  deleteMessage,
} from "../controllers/message.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { checkChatOwnership } from "../middleware/ownership.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { sendMessageSchema } from "../validators/message.validation.js";

const router = Router();

// Authentication required
router.use(requireAuth);

// Messages routes
router.get("/:chatId/messages", checkChatOwnership, getChatMessages);
router.post("/:chatId/messages", checkChatOwnership, validateBody(sendMessageSchema), sendMessage);
router.delete("/:chatId/messages/:messageId", checkChatOwnership, deleteMessage);

export default router;