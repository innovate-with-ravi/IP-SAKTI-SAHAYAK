/**
 * Swap the inside of this function for your real AI/RAG call
 * (OpenAI, Anthropic, a local retrieval pipeline, etc). Everything
 * upstream (routes/messages.js) just awaits whatever this returns.
 *
 * @param {Object} params
 * @param {string} params.text - the user's question
 * @param {"india"|"international"} params.mode
 * @param {Object|null} params.file - { filename, path, mimetype } or null
 * @returns {Promise<{text: string, citations: Array, confidence: string}>}
 */
async function getAssistantResponse({ text, mode, file }) {
    // ---- MOCK IMPLEMENTATION (replace this block) ----
    const contextNote = mode === "india"
        ? "in the context of Indian IP law and Ayurveda"
        : "from an international IP law perspective";

    const fileNote = file ? ` I also looked at the attached file "${file.filename}".` : "";

    return {
        text: `(Mock response) Here's what I found about "${text}" ${contextNote}.${fileNote}`,
        citations: [],
        confidence: "medium",
    };
    // ---- END MOCK ----
}

/**
 * Generates a short chat title from the first user message.
 * Replace with an LLM call for better titles, or keep this
 * simple heuristic.
 */
function generateTitleFromText(text) {
    const cleaned = text.trim().replace(/[?.!]+$/, "");
    const words = cleaned.split(/\s+/).slice(0, 6);
    let title = words.join(" ");
    title = title.charAt(0).toUpperCase() + title.slice(1);
    return title.length > 60 ? title.slice(0, 57) + "..." : title;
}

module.exports = { getAssistantResponse, generateTitleFromText };
