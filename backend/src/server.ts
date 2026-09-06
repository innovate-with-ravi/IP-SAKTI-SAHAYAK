import "dotenv/config";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
 
const app = express();
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const PORT = process.env.PORT || 3000;
 
app.use(express.json());
 
app.get("/health", async (_req, res) => {
  try {
    // Confirms the DB connection works, not just that the server is up.
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "unreachable" });
  }
});
 
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
