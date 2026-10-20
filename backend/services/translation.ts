import { SarvamAIClient } from "sarvamai";
import { TranslationResultSchema, type TranslationResult } from "../validators/translation.validation.js";

let sarvamClient: SarvamAIClient | null = null;

function getSarvamClient(): SarvamAIClient {
  if (!sarvamClient) {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      throw new Error("SARVAM_API_KEY environment variable is missing");
    }
    sarvamClient = new SarvamAIClient({
      apiSubscriptionKey: apiKey,
    });
  }
  return sarvamClient;
}

export async function translateToEnglish(
  text: string
): Promise<TranslationResult> {
  if (!text || !text.trim()) {
    throw new Error("Text cannot be empty");
  }

  if (text.length > 1000) {
    throw new Error("Text must not exceed 1000 characters");
  }

  try {
    const sarvam = getSarvamClient();
    const response = await sarvam.text.translate({
      input: text,
      source_language_code: "auto",
      target_language_code: "en-IN",
      model: "mayura:v1",
    });

    return TranslationResultSchema.parse({
      originalText: text,
      translatedText: response.translated_text,
      detectedLanguage: response.source_language_code,
    });
  } catch (error) {
    console.error("Sarvam translation error:", error);
    throw new Error("Failed to translate text into English");
  }
}
