const express = require("express");
const router = express.Router();

const Chat = require("../models/Chat");
const Message = require("../models/Message");
const authenticate = require("../middleware/auth"); // swap for your existing middleware

/* =========================================================
   POST /chats — create a new chat
========================================================= */
router.post("/", authenticate, async (req, res) => {
    try {
        const { mode } = req.body;
        const userId = req.userId; // set by authenticate middleware

        const chat = await Chat.create({
            userId,
            title: "New Chat",
            mode: mode === "international" ? "international" : "india",
        });

        res.status(201).json({
            id: chat._id,
            title: chat.title,
            mode: chat.mode,
            createdAt: chat.createdAt,
        });
    } catch (err) {
        console.error("Create chat error:", err);
        res.status(500).json({ message: "Unable to create chat." });
    }
});

/* =========================================================
   GET /chats/:userId — list a user's chats (newest first)
========================================================= */
router.get("/:userId", authenticate, async (req, res) => {
    try {
        const { userId } = req.params;

        // Only ever return the authenticated user's own chats
        if (userId !== req.userId) {
            return res.status(403).json({ message: "Forbidden." });
        }

        const chats = await Chat.find({ userId }).sort({ updatedAt: -1 });

        res.json(
            chats.map((c) => ({
                id: c._id,
                title: c.title,
                mode: c.mode,
                createdAt: c.createdAt,
            }))
        );
    } catch (err) {
        console.error("List chats error:", err);
        res.status(500).json({ message: "Unable to load chats." });
    }
});

/* =========================================================
   GET /chats/:chatId — chat details + its messages
   (only used with a chat's own id — Mongo ids are 24 hex chars
   so this never collides with the /:userId route above)
========================================================= */
router.get("/detail/:chatId", authenticate, async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findOne({ _id: chatId, userId: req.userId });
        if (!chat) {
            return res.status(404).json({ message: "Chat not found." });
        }

        const messages = await Message.find({ chatId }).sort({ createdAt: 1 });

        res.json({
            id: chat._id,
            title: chat.title,
            mode: chat.mode,
            createdAt: chat.createdAt,
            messages: messages.map((m) => ({
                id: m._id,
                role: m.role,
                content: m.text,
                citations: m.citations,
                confidence: m.confidence,
                jurisdiction: m.jurisdiction,
                createdAt: m.createdAt,
            })),
        });
    } catch (err) {
        console.error("Get chat error:", err);
        res.status(500).json({ message: "Unable to load chat." });
    }
});

/* =========================================================
   DELETE /chats/:chatId
========================================================= */
router.delete("/:chatId", authenticate, async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findOne({ _id: chatId, userId: req.userId });
        if (!chat) {
            return res.status(404).json({ message: "Chat not found." });
        }

        await Message.deleteMany({ chatId });
        await Chat.deleteOne({ _id: chatId });

        res.json({ message: "Chat deleted." });
    } catch (err) {
        console.error("Delete chat error:", err);
        res.status(500).json({ message: "Unable to delete chat." });
    }
});

module.exports = router;
