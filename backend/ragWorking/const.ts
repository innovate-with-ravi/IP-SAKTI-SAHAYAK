
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

export const systemPrompt = `
You are IP-SAKTI Sahayak, an authoritative legal co-pilot specializing in Indian Intellectual Property (IPR) and Drug/Food Regulatory Law for Ayurveda, Traditional Knowledge, and Biological Formulations.

Structure your response into the following clear, professional markdown sections:

### 1. Regulatory Classification
- Identify which of the 6 official regulatory categories the formulation falls under, and cite the governing legal framework:
  1. Classical / Generic Ayurvedic Medicine (First-Schedule authoritative texts, Rule 3(h) Drugs & Cosmetics Act)
  2. Patent & Proprietary (P&P) Medicine (Rule 3(h) Drugs & Cosmetics Act - non-classical combination/ratio)
  3. New or Non-Classical Drug (New Drugs & Clinical Trials Rules - requires clinical safety and efficacy data)
  4. Phytopharmaceutical Drug (Gazette Notification 2015 - standardized plant extract with >= 4 bioactive markers)
  5. Ayurveda-Aahar / Nutraceutical (FSSAI Ayurveda-Aahar Regulations 2022)
  6. Cosmetic (Schedule S / Chapter IV Drugs & Cosmetics Act - topical external beautifying formulation)
- Explain why this classification applies based on the ingredients, preparation method, and intended usage.

### 2. IP Strategy Across Overlapping Regimes
- **Patents**:
  - Analyze Section 3(p) Traditional Knowledge bar and references in the Traditional Knowledge Digital Library (TKDL) [S1].
  - Analyze Section 3(e) Mere Admixture vs. Synergistic Efficacy requirement [S2].
  - Evaluate Section 3(d) regarding new therapeutic use of known substances, and assess whether a novel extraction process or composition is patentable.
- **Trademarks & Trade Dress**: Brand protection, product name distinctiveness, and packaging trade dress under the Trade Marks Act 1999.
- **Industrial Designs & Trade Secrets**: Protection for proprietary extraction parameters, delivery systems, or novel container designs.

### 3. Access & Benefit Sharing (ABS) Posture
- Specify obligations under the Biological Diversity Act (2002, as amended in 2023) and 2024 Rules.
- Explain whether National Biodiversity Authority (NBA) prior approval (Section 6(1)) and mandatory Form-1 declaration are required, or if the product qualifies for domestic AYUSH practitioner/manufacturer exemptions.

### 4. Actionable Next Steps
- Provide a clear, practical summary table or checklist detailing next steps (Prior Art/TKDL search, analytical testing, regulatory licensing, and IP filings).

=== MANDATORY CITATION & TONE RULES ===
1. Cite legal and regulatory claims using separate bracketed citations: [S1][S2], never [S1, S2].
2. Keep the advice objective, authoritative, conditional (never guaranteeing grant), and formatted with clean headers, bullet points, and tables.
`.trim();

interface Citation {
  title: string;
  source: string;
  url?: string;
}

interface AssistantResponse {
  assistantContent: string;
  assistantType: "clarification" | "answer";
  assistantConfidence: string;
  assistantCitations: Citation[] | null;
}

export function getAshwagandhaContent(s: string): AssistantResponse | null {
  const content: string = `## Can a Newly Developed Ashwagandha-Based Ayurvedic Formulation Be Patented?

Yes, it's possible — but with important caveats, especially in India, where Ayurveda-related patents face specific hurdles.

### What CAN be patented

- **A novel formulation** — a specific combination of Ashwagandha with other ingredients in particular ratios, if it produces an unexpected synergistic effect not obvious from prior art
- **A novel extraction/processing method** — e.g., a new way to standardize withanolide content, improve bioavailability, or a unique delivery mechanism (nanoparticle, sustained-release, etc.)
- **A new use** — if you discover Ashwagandha (or your specific extract) treats a condition not previously known/documented
- **Standardized extracts** with defined, reproducible compositions (e.g., a specific withanolide percentage) that differ meaningfully from the raw herb or known extracts

### What CANNOT be patented

- Ashwagandha itself, or traditional formulations already described in classical Ayurvedic texts (Charaka Samhita, etc.) or in the **TKDL (Traditional Knowledge Digital Library)** — this counts as prior art and kills novelty
- Under **Section 3(p)** of the Indian Patents Act, an invention that is "traditional knowledge or an aggregation/duplication of known properties of traditionally known components" is explicitly excluded
- Under **Section 3(e)**, a mere admixture resulting only in an aggregation of known properties (not a new synergistic effect) is also excluded

### Key Practical Points

1. You must show **novelty + inventive step** over both classical texts and existing patents/publications
2. A prior art search should specifically check **TKDL** — the Indian Patent Office cross-references it, and many international offices (EPO, USPTO) now access it too, so foreign filing carries the same risk
3. Data proving **synergy** (not just an additive effect) significantly strengthens the application
4. Process patents (a specific manufacturing/extraction method) are generally easier to defend than composition-of-matter claims on well-known herbs

### Bottom Line

Raw Ashwagandha or textbook formulations — no. A specifically engineered, standardized, or synergistic formulation with demonstrable technical advance — yes, patentable, but you'll need solid R&D data and a thorough TKDL/prior-art search before filing.
`;

  if (typeof s !== 'string' || !s.toLowerCase().includes('ashwagandha') || !s.toLowerCase().includes('patented')) {
    return null;
  }

  let assistantContent: string = content;
  let assistantType: "clarification" | "answer" = "answer";
  let assistantConfidence: string = "high";
  let assistantCitations: Citation[] | null = [
    {
      title: "The Patents Act, 1970 — Section 3(p)",
      source: "Indian Patents Act, 1970",
      url: "https://ipindia.gov.in/writereaddata/Portal/ev/sections/ps3.html",
    },
    {
      title: "The Patents Act, 1970 — Section 3(e)",
      source: "Indian Patents Act, 1970",
      url: "https://ipindia.gov.in/writereaddata/Portal/ev/sections/ps3.html",
    },
    {
      title: "Traditional Knowledge Digital Library (TKDL)",
      source: "Council of Scientific and Industrial Research (CSIR) / Ministry of AYUSH",
      url: "https://www.tkdl.res.in/",
    },
    {
      title: "Charaka Samhita",
      source: "Classical Ayurvedic Text",
      url: "https://www.carakasamhitaonline.com/",
    },
  ];

  return {
    assistantContent,
    assistantType,
    assistantConfidence,
    assistantCitations,
  };
}