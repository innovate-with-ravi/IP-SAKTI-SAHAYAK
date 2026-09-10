
type ChromaMetadata = Record<
  string,
  string | number | boolean | null
>;

interface QdrantPayload {
  original_id?: string;
  content?: string;

  header_Act?: string;
  header_Chapter?: string;
  header_Section?: string;

  document_title?: string;
  document_type?: string;
  category?: string;

  source_file?: string;
  chunk_id?: string;
  chunk_index?: number;

  act_year?: number | null;
  amendment_year?: number | null;

  [key: string]: unknown;
}

interface QdrantPoint {
  id: string | number;
  version?: number;
  score: number;
  payload?: QdrantPayload | null;
}

interface QdrantResult {
  points: QdrantPoint[];
}

interface AnswerSource {
  citationId: string;
  vectorId: string;
  chunkId: string;
  score: number;
  title: string;
  documentType: string;
  act: string;
  chapter: string;
  section: string;
  content: string;
}

interface AnswerableData {
  context: string;
  sources: AnswerSource[];
}


type ScoredPoint = {
  score: number;
};

export function calculateAverageScore(
  points: readonly ScoredPoint[],
): number {
  if (points.length === 0) {
    return 0;
  }

  const totalScore = points.reduce(
    (sum, point) => sum + point.score,
    0,
  );

  return totalScore / points.length;
}

export function createAnswerableContext(
  result: QdrantResult,
  topK: number = 3
): AnswerableData {
  if (
    !result ||
    !Array.isArray(result.points)
  ) {
    throw new Error(
      "Invalid Qdrant result: points array is missing"
    );
  }

  const sources: AnswerSource[] = result.points
    // Only keep points containing content
    .filter(point => {
      return (
        point.payload &&
        typeof point.payload.content === "string" &&
        point.payload.content.trim().length > 0
      );
    })

    // Qdrant: higher score means more relevant
    .sort((a, b) => b.score - a.score)

    // Take top 3
    .slice(0, topK)

    .map((point, index) => {
      const payload = point.payload!;

      return {
        citationId: `S${index + 1}`,

        vectorId: String(point.id),

        chunkId:
          payload.chunk_id ??
          payload.original_id ??
          String(point.id),

        score: point.score,

        title:
          payload.document_title ??
          payload.header_Act ??
          "Unknown document",

        documentType:
          payload.document_type ??
          "Unknown",

        act:
          payload.header_Act ??
          "Not specified",

        chapter:
          payload.header_Chapter ??
          "Not specified",

        section:
          payload.header_Section ??
          "Not specified",

        content: payload.content!,
      };
    });

  if (sources.length === 0) {
    return {
      context: "",
      sources: [],
    };
  }

  const context = sources
    .map(source => {
      return `
[${source.citationId}]
Document: ${source.title}
Document Type: ${source.documentType}
Act/Authority: ${source.act}
Chapter: ${source.chapter}
Section: ${source.section}
Chunk ID: ${source.chunkId}

CONTENT:
${source.content}
`.trim();
    })
    .join(
      "\n\n==============================\n\n"
    );

  return {
    context,
    sources,
  };
}

export function flattenMetadata(metadata: any): ChromaMetadata {
  const result: ChromaMetadata = {};

  // structural headers
  if (metadata?.structural_headers) {
    for (const [key, value] of Object.entries(
      metadata.structural_headers
    )) {
      result[`header_${key}`] =
        typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
    }
  }

  // global metadata
  if (metadata?.global_metadata) {
    result.document_title =
      metadata.global_metadata.document_title ?? "";

    result.act_year =
      metadata.global_metadata.act_year ?? null;

    result.amendment_year =
      metadata.global_metadata.amendment_year ?? null;

    result.document_type =
      metadata.global_metadata.document_type ?? "";

    result.category =
      metadata.global_metadata.category ?? "";
  }

  // technical tags
  if (metadata?.technical_tags) {
    result.source_file =
      metadata.technical_tags.source_file ?? "";

    result.chunk_index =
      metadata.technical_tags.chunk_index ?? 0;

    result.chunk_id =
      metadata.technical_tags.chunk_id ?? "";

    result.content_sha256 =
      metadata.technical_tags.content_sha256 ?? "";
  }

  return result;
}

export const systemPrompt =  `
1. Start with a direct preliminary verdict.
2. Cite each legal claim using separate citations:
   [S1][S2], never [S1, S2].
3. Never state that a new therapeutic use of a known
   substance is patentable when Section 3(d) applies.
4. Do not assume that a newly isolated plant constituent
   automatically has an inventive step.
5. A new ingredient, ratio, extract, use, or process is not
   automatically patentable.
6. Never say information is absent if it appears in any
   retrieved source.
7. Give practical actions supported by the sources.
8. Do not introduce external legal requirements unless they
   are present in the retrieved sources.
9. If a source describes a requirement, attribute it to that
    source instead of presenting it as independently verified
    current law.
10. Treat patentability as conditional, not guaranteed.
11. Keep the answer concise.
              `