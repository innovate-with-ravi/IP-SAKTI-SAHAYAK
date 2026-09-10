import { z } from "zod";

export const sendMessageSchema = z.object({
  text: z.string().trim().min(1, "Message cannot be empty"),
  jurisdiction: z.enum(["india", "international"], {
    error: "Jurisdiction is required and must be either 'india' or 'international'",
  }),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
