import { z } from "zod";

export const TranslationResultSchema = z.object({
  originalText: z.string(),
  translatedText: z.string(),
  detectedLanguage: z.string(),
});

export type TranslationResult = z.infer<typeof TranslationResultSchema>;