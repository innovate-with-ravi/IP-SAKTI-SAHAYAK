import express from "express";
import cors from "cors";
import { prisma } from "../config/db.js";
import chatRoutes from "../routes/chat.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "ok",
      db: "connected",
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      db: "unreachable",
    });
  }
});

// Routes
app.use("/chats", chatRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
  });
});

export default app;