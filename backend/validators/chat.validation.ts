import { z } from "zod";

export const createChatSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
});

export const updateChatSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(255, "Title is too long"),
});

export type CreateChatInput = z.infer<typeof createChatSchema>;
export type UpdateChatInput = z.infer<typeof updateChatSchema>;
