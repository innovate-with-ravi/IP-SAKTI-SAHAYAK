import path from "node:path";
import * as fs from "node:fs";

import { GoogleGenAI } from "@google/genai";
import { QdrantClient } from "@qdrant/js-client-rest";
import Groq from "groq-sdk";
import { v5 as uuidv5 } from "uuid";

import { calculateAverageScore, createAnswerableContext, flattenMetadata, systemPrompt } from "./const.js";

// ==========================================
// CONFIG
// ==========================================

const MODEL = "gemini-embedding-2";
const DIMENSIONS = 3072;

const COLLECTION_NAME = "ipsakti_knowledge";
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY!,
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY1!,
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

function getQdrantId(originalId: string): string {
  return uuidv5(originalId, uuidv5.URL);
}



// ==========================================
// CREATE / GET COLLECTION
// ==========================================

export async function main() {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some(
    (collection) => collection.name === COLLECTION_NAME,
  );

  if (!exists) {
    console.log("Creating Qdrant collection...");
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: DIMENSIONS,
        distance: "Cosine",
      },
    });
    console.log("✅ Collection created");
  } else {
    console.log("✅ Collection already exists");
  }

  return COLLECTION_NAME;
}

// ==========================================
// INSERT DATA
// ==========================================

export async function insertInDb() {
  await main();
  const allData : any = {
    ids: [] as string[],
    documents: [] as string[],
    embeddings: [] as number[][],
    metadatas: [] as Record<string, any>[],
  };

  // ==========================================
  // SOURCE 1
  // ayurveda_embedded/*.jsonl
  // ==========================================

  const dataFolder = path.join(
    process.cwd(),
    "cleaned_data",
    "ayurveda_embedded"
  );

  const files = fs
    .readdirSync(dataFolder)
    .filter((file) => file.endsWith(".jsonl"));

  console.log(`Found ${files.length} JSONL files`);

  for (const file of files) {
    const filePath = path.join(dataFolder, file);
    console.log("Reading:", file);
    const content = fs.readFileSync(filePath, "utf-8");
    const jsonData = content
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line, index) => {
        try {
          return JSON.parse(line);
        } catch {
          throw new Error(`${file}:${index + 1} contains invalid JSON`);
        }
      });

    jsonData.forEach((ele: any, i: number) => {
      const originalId = `${ele.metadata.id}-${ele.source ?? file}-${i}`;

      allData.ids.push(originalId);
      allData.documents.push(ele.content);
      allData.embeddings.push(ele.embedding);
      allData.metadatas.push({
        ...ele.metadata,
        // useful additional metadata
        source_file: file,
      });
    });
  }

  // ==========================================
  // SOURCE 2
  // cleaned_data/*.json
  // ==========================================

  const dataFolder2 = path.join(process.cwd(), "cleaned_data");
  const files2 = fs
    .readdirSync(dataFolder2)
    .filter((file) => file.endsWith(".json"));

  console.log(`Found ${files2.length} JSON files`);

  for (const file of files2) {
    const filePath = path.join(dataFolder2, file);
    console.log("Reading:", file);
    const content = fs.readFileSync(filePath, "utf-8");
    const jsonData = JSON.parse(content);
    if (!Array.isArray(jsonData)) {
      console.log(`Skipping ${file}: root is not array`);
      continue;
    }

    jsonData.forEach((ele: any) => {
      const originalId = ele.metadata.technical_tags.chunk_id;

      allData.ids.push(originalId);
      allData.documents.push(ele.content);
      allData.embeddings.push(ele.vector);
      allData.metadatas.push({
        ...flattenMetadata(ele.metadata),
        source_file: file,
      });
    });
  }

  // ==========================================
  // VALIDATION
  // ==========================================

  console.log("\nTotal records:", allData.ids.length);

  console.log({
    ids: allData.ids.length,
    documents: allData.documents.length,
    embeddings: allData.embeddings.length,
    metadatas: allData.metadatas.length,
  });

  if (
    allData.ids.length !== allData.documents.length ||
    allData.ids.length !== allData.embeddings.length ||
    allData.ids.length !== allData.metadatas.length
  ) {
    throw new Error("❌ Data arrays have different lengths");
  }

  // Check embedding dimension

  for (let i = 0; i < allData.embeddings.length; i++) {
    if (allData.embeddings[i].length !== DIMENSIONS) {
      throw new Error(
        `Invalid embedding dimension at index ${i}: ` +
          `${allData.embeddings[i].length}`,
      );
    }
  }

  // ==========================================
  // QDRANT UPSERT
  // ==========================================

  // Qdrant can accept batch insertion.
  // Since vectors are 3072-dimensional + large payloads,
  // start safely with 50.

  const BATCH_SIZE = 50;

  for (let i = 0; i < allData.ids.length; i += BATCH_SIZE) {
    const end = Math.min(i + BATCH_SIZE, allData.ids.length);

    const points = [];

    for (let j = i; j < end; j++) {
      points.push({
        id: getQdrantId(allData.ids[j]),
        vector: allData.embeddings[j],
        payload: {
          // Keep your original ID
          original_id: allData.ids[j],
          // Chroma "documents" equivalent
          content: allData.documents[j],

          // Metadata
          ...allData.metadatas[j],
        },
      });
    }

    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points,
    });

    console.log(`✅ Uploaded ${end}/${allData.ids.length}`);
  }

  console.log("\n🎉 All data inserted into Qdrant");
}

export interface HistoryMessage {
  role: string;
  content: string;
}

export const rag1 = async (
  queryString: string,
  history: HistoryMessage[] = []
) => {
  // await insertInDb();
  // return;

  const queryEmbedding: any = await ai.models.embedContent({
    model: MODEL,
    contents: queryString,
    config: {
      outputDimensionality: DIMENSIONS,
    },
  });

  const result: any = await qdrant.query(COLLECTION_NAME, {
    query: queryEmbedding.embeddings?.[0]?.values,
    limit: 3,
    with_payload: true,
    with_vector: false,
  });

  const confidence = calculateAverageScore(result.points ?? []);
  const answer = createAnswerableContext(result);

  const conversationContext = history.length > 0
    ? "\n<recent_conversation_history>\n" +
      history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n") +
      "\n</recent_conversation_history>\n"
    : "";

  const userPrompt = `
    <user_question>
    ${queryString}
    </user_question>
    ${conversationContext}
    <retrieved_legal_sources>
    ${answer.context}
    </retrieved_legal_sources>

    system : ${systemPrompt}
`.trim();

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",

    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],

    temperature: 0.2,
    max_tokens: 1500,
  });

  const citations = (answer.sources ?? []).map((source) => ({
    source: source.act && source.act !== "Not specified" ? source.act : source.title,
    header_path: [source.chapter, source.section].filter(
      (val) => Boolean(val) && val !== "Not specified"
    ),
    url: `#citation-${source.citationId}`,
  }));

  let finalAnswer: any = {};
  const response = completion.choices[0]?.message?.content?.trim();
  finalAnswer.content = response;
  finalAnswer.confidence = confidence;
  finalAnswer.citations = citations.length > 0 ? citations : null;
  return finalAnswer;
};
