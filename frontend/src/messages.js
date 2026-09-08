const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

const Chat = require("../models/Chat");
const Message = require("../models/Message");
const authenticate = require("../middleware/auth"); // swap for your existing middleware
const { getAssistantResponse, generateTitleFromText } = require("../services/aiService");

/* =========================================================
   MULTER — file upload config
========================================================= */
const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
];

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
    filename: (req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Unsupported file type."));
        }
    },
});

/* =========================================================
   POST /messages
========================================================= */
router.post("/", authenticate, upload.single("file"), async (req, res) => {
    try {
        const { chatId, text, mode } = req.body;
        const userId = req.userId;

        if (!chatId) {
            return res.status(400).json({ message: "chatId is required." });
        }
        if (!text || !text.trim()) {
            return res.status(400).json({ message: "Message text cannot be empty." });
        }
        if (!["india", "international"].includes(mode)) {
            return res.status(400).json({ message: "mode must be 'india' or 'international'." });
        }

        const chat = await Chat.findOne({ _id: chatId, userId });
        if (!chat) {
            return res.status(404).json({ message: "Chat not found." });
        }

        // Keep the chat's mode in sync with the mode used for this message
        if (chat.mode !== mode) {
            chat.mode = mode;
        }

        const fileMeta = req.file
            ? { filename: req.file.originalname, path: req.file.path, mimetype: req.file.mimetype }
            : undefined;

        const userMessage = await Message.create({
            chatId,
            userId,
            role: "user",
            text,
            file: fileMeta,
        });

        // Auto-generate the chat title from the first user message
        const existingMessageCount = await Message.countDocuments({ chatId });
        if (existingMessageCount === 1) {
            chat.title = generateTitleFromText(text);
        }
        await chat.save();

        let aiResult;
        try {
            aiResult = await getAssistantResponse({ text, mode, file: fileMeta || null });
        } catch (aiErr) {
            console.error("AI service error:", aiErr);
            return res.status(503).json({ message: "The assistant is temporarily unavailable." });
        }

        const assistantMessage = await Message.create({
            chatId,
            userId,
            role: "assistant",
            text: aiResult.text,
            citations: aiResult.citations || [],
            confidence: aiResult.confidence || "medium",
            jurisdiction: mode,
        });

        res.status(201).json({
            message: "Message processed successfully",
            userMessage: {
                _id: userMessage._id,
                role: "user",
                text: userMessage.text,
                createdAt: userMessage.createdAt,
            },
            assistantMessage: {
                _id: assistantMessage._id,
                role: "assistant",
                text: assistantMessage.text,
                citations: assistantMessage.citations,
                confidence: assistantMessage.confidence,
                jurisdiction: assistantMessage.jurisdiction,
                createdAt: assistantMessage.createdAt,
            },
        });
    } catch (err) {
        console.error("Send message error:", err);
        res.status(500).json({ message: "Unable to process message." });
    }
});

module.exports = router;
