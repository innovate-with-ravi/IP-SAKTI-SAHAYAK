const mongoose = require("mongoose");

const citationSchema = new mongoose.Schema(
    {
        source: String,
        header_path: [String],
        url: String,
    },
    { _id: false }
);

const messageSchema = new mongoose.Schema(
    {
        chatId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        role: {
            type: String,
            enum: ["user", "assistant"],
            required: true,
        },
        text: {
            type: String,
            required: true,
        },
        file: {
            filename: String,
            path: String,
            mimetype: String,
        },
        // assistant-only metadata
        citations: [citationSchema],
        confidence: {
            type: String,
            enum: ["high", "medium", "low"],
        },
        jurisdiction: {
            type: String,
            enum: ["india", "international"],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
