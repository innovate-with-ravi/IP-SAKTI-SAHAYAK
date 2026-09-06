import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "../config/db.js";
import chatRoutes from "../routes/chat.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "unreachable" });
  }
});

// Chat & Message routes (Stage 2)
app.use("/chats", chatRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Start server if run directly
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Ayurveda IPR Assistant Backend listening on port ${PORT}`);
  });
}

export default app;
