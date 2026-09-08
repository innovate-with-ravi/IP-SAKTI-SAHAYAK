import type { Request, Response } from "express";
import {
  getUserById,
  updateUser,
} from "../services/user.js";

export async function getProfile(
  req: Request,
  res: Response
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to fetch profile",
    });
  }
}

export async function updateProfile(
  req: Request,
  res: Response
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const { name } = req.body;

    if (name !== undefined && typeof name !== "string") {
      return res.status(400).json({
        error: "Name must be a string",
      });
    }

    const user = await updateUser(userId, {
      name,
    });

    return res.json({
      message: "Profile updated successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to update profile",
    });
  }
}