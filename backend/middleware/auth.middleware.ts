import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret_jwt_key_ayurveda";

export interface JwtPayload {
  userId?: string;
  id?: string;
  role?: string;
  email?: string;
  [key: string]: unknown;
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({ error: "Unauthorized: Token missing" });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      const id = decoded.userId || decoded.id;

      if (!id) {
        res.status(401).json({ error: "Unauthorized: Invalid token payload" });
        return;
      }

      req.user = {
        id,
        userId: id,
        role: decoded.role || "user",
        email: decoded.email,
      };
      next();
      return;
    } catch {
      res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
      return;
    }
  }

  // Development fallback for standalone testing prior to Stage 1 auth integration
  const devUserId = req.headers["x-user-id"];
  if (devUserId && typeof devUserId === "string") {
    req.user = {
      id: devUserId,
      userId: devUserId,
      role: typeof req.headers["x-user-role"] === "string" ? req.headers["x-user-role"] : "user",
    };
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized: Authentication required" });
};
