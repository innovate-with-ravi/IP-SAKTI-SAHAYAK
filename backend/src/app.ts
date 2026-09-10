import express from "express";
import cors from "cors";
import { prisma } from "../config/db.js";
import authRoutes from "../routes/auth.routes.js";
import userRoutes from "../routes/user.routes.js";
import chatRoutes from "../routes/chat.routes.js";
import messageRoutes from "../routes/message.routes.js";
import "dotenv/config";

const app = express();


const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    optionsSuccessStatus: 200,
  })
);

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

// API-prefixed aliases
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/chats", messageRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
  });
});

export default app;