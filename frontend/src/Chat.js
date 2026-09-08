const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // adjust ref name to match your existing User model
            required: true,
        },
        title: {
            type: String,
            default: "New Chat",
        },
        mode: {
            type: String,
            enum: ["india", "international"],
            default: "india",
        },
    },
    { timestamps: true } // gives createdAt / updatedAt
);

module.exports = mongoose.model("Chat", chatSchema);
