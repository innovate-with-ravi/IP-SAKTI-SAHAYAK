import { Router } from "express";
import {
  createChat,
  listChats,
  getChatById,
  updateChatTitle,
  deleteChat,
} from "../controllers/chat.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { checkChatOwnership } from "../middleware/ownership.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import {
  createChatSchema,
  updateChatSchema,
} from "../validators/chat.validation.js";

const router = Router();

// All chat routes require authentication
router.use(requireAuth);

// Chat routes
router.post("/", validateBody(createChatSchema), createChat);
router.get("/", listChats);
router.get("/:id", checkChatOwnership, getChatById);
router.patch("/:id", checkChatOwnership, validateBody(updateChatSchema), updateChatTitle);
router.delete("/:id", checkChatOwnership, deleteChat);

export default router;
