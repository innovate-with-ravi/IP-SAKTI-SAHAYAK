"""RAG Subgraph Node: Async DB Search.

Performs concurrent vector search across selected legal namespaces in Qdrant,
with an asyncio.Semaphore(5) concurrency cap to prevent socket exhaustion and rate limits.
Implements Plan 2: Two-Tier Global Reranking with high-fidelity statutory corpus fallback.
"""

from typing import TypedDict
import os
import asyncio
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from google import genai
from qdrant_client import AsyncQdrantClient, models

from core.state import GraphState, doc
from core.config import settings

load_dotenv()

# Authoritative statutory fallback corpus covering all 10 legal namespaces
STATUTORY_FALLBACK_CORPUS: Dict[str, List[Dict[str, str|int]]] = {
    "patents": [
        {
            "namespace": "patents",
            "section": "Patents Act, 1970 - Section 3(p)",
            "title": "Traditional Knowledge Statutory Bar",
            "text": "An invention which in effect is traditional knowledge or which is an aggregation or duplication of known properties of traditionally known component or components is not an invention within the meaning of this Act.",
            "score": 0.95
        },
        {
            "namespace": "patents",
            "section": "Patents Act, 1970 - Section 3(e)",
            "title": "Mere Admixture Exclusion",
            "text": "A substance obtained by a mere admixture resulting only in the aggregation of the properties of the components thereof or a process for producing such substance is not an invention, unless synergistic efficacy is demonstrated.",
            "score": 0.88
        },
        {
            "namespace": "patents",
            "section": "Patents Act, 1970 - Section 3(d)",
            "title": "Enhancement of Known Efficacy",
            "text": "The mere discovery of a new form of a known substance which does not result in the enhancement of the known efficacy of that substance is not patentable.",
            "score": 0.82
        }
    ],
    "ayush_drug_regulations": [
        {
            "namespace": "ayush_drug_regulations",
            "section": "Drugs & Cosmetics Act, 1940 - Section 3(a)",
            "title": "Ayurvedic Drug Statutory Definition",
            "text": "Ayurvedic, Siddha or Unani drug includes all medicines intended for internal or external use for or in the diagnosis, treatment, mitigation or prevention of disease in human beings or animals, and manufactured exclusively in accordance with the formulae described in the authoritative books of Ayurvedic, Siddha and Unani systems specified in the First Schedule.",
            "score": 0.94
        },
        {
            "namespace": "ayush_drug_regulations",
            "section": "Drugs and Cosmetics Rules, 1945 - Rule 158B",
            "title": "Proof of Effectiveness and Safety Guidelines",
            "text": "Requires safety and effectiveness documentation for Ayurvedic proprietary medicines; extracts of medicinal plants must be documented with pharmacopoeial standards and published literature or clinical trial reports.",
            "score": 0.89
        },
        {
            "namespace": "ayush_drug_regulations",
            "section": "Drugs and Cosmetics Rules, 1945 - Form 24-D",
            "title": "Ayurvedic Manufacturing License",
            "text": "Application for the grant or renewal of a license to manufacture for sale of Ayurvedic, Siddha or Unani drugs under Good Manufacturing Practices (Schedule T).",
            "score": 0.84
        }
    ],
    "biodiversity_abs": [
        {
            "namespace": "biodiversity_abs",
            "section": "Biological Diversity Act, 2002 - Section 3",
            "title": "Access to Biological Resources (NBA Approval)",
            "text": "Certain persons (non-citizens, non-residents, foreign corporate bodies) shall not obtain any biological resource occurring in India or knowledge associated thereto for research or for commercial utilization without previous approval of the National Biodiversity Authority.",
            "score": 0.93
        },
        {
            "namespace": "biodiversity_abs",
            "section": "Biological Diversity Act, 2002 - Section 6",
            "title": "Application for Intellectual Property Rights (ABS Approval)",
            "text": "No person shall apply for any intellectual property right, by whatever name called, in or outside India for any invention based on any research or information on a biological resource obtained from India without obtaining the previous approval of the National Biodiversity Authority before grant of patent.",
            "score": 0.96
        },
        {
            "namespace": "biodiversity_abs",
            "section": "Biological Diversity Act, 2002 - Section 7",
            "title": "Prior Intimation to State Biodiversity Board",
            "text": "Indian citizens and domestic corporate bodies must provide prior intimation to the concerned State Biodiversity Board before obtaining biological resources for commercial utilization.",
            "score": 0.87
        }
    ],
    "fssai_ayurveda_aahara": [
        {
            "namespace": "fssai_ayurveda_aahara",
            "section": "FSSAI (Ayurveda Aahara) Regulations, 2022 - Regulation 3",
            "title": "Definition and Permitted Ingredients",
            "text": "Ayurveda Aahara means food prepared in accordance with the recipes or books/processes specified in the First Schedule of the Drugs and Cosmetics Act, 1940, intended for dietary nutritional use.",
            "score": 0.94
        },
        {
            "namespace": "fssai_ayurveda_aahara",
            "section": "FSSAI (Ayurveda Aahara) Regulations, 2022 - Regulation 6",
            "title": "Prohibition of Synthetic Additives & Pure Chemical Concentrates",
            "text": "Ayurveda Aahara shall not contain synthetic vitamins, minerals, or amino acids, nor pure chemical active pharmaceutical ingredients, and shall not make claims for treating or curing acute medical conditions.",
            "score": 0.91
        }
    ],
    "designs": [
        {
            "namespace": "designs",
            "section": "Designs Act, 2000 - Section 2(d)",
            "title": "Definition of Design (Shape, Configuration, Pattern)",
            "text": "Design means only the features of shape, configuration, pattern, ornament or composition of lines or colours applied to any article whether in two dimensional or three dimensional or in both forms, by any industrial process.",
            "score": 0.92
        },
        {
            "namespace": "designs",
            "section": "Designs Act, 2000 - Section 4",
            "title": "Prohibition of Registration of Certain Designs",
            "text": "A design which is not new or original, or has been disclosed to the public anywhere in India or abroad prior to filing date, or is not significantly distinguishable from known designs or combination of known designs, cannot be registered.",
            "score": 0.88
        }
    ],
    "trademarks": [
        {
            "namespace": "trademarks",
            "section": "Trade Marks Act, 1999 - Section 9",
            "title": "Absolute Grounds for Refusal of Registration",
            "text": "Trademarks which are devoid of any distinctive character, or which consist exclusively of marks or indications which may serve in trade to designate the kind, quality, intended purpose, or geographical origin of goods shall not be registered.",
            "score": 0.93
        },
        {
            "namespace": "trademarks",
            "section": "Trade Marks Act, 1999 - Section 11",
            "title": "Relative Grounds for Refusal (Conflicting Prior Marks)",
            "text": "A trademark shall not be registered if there exists a likelihood of confusion on the part of the public due to its identity or similarity with an earlier trade mark and the identity or similarity of the goods or services.",
            "score": 0.87
        }
    ],
    "geographical_indications": [
        {
            "namespace": "geographical_indications",
            "section": "Geographical Indications of Goods Act, 1999 - Section 2(e)",
            "title": "Definition of Geographical Indication",
            "text": "An indication which identifies agricultural, natural or manufactured goods as originating in a territory where a given quality, reputation or other characteristic of such goods is essentially attributable to its geographical origin.",
            "score": 0.93
        },
        {
            "namespace": "geographical_indications",
            "section": "Geographical Indications of Goods Act, 1999 - Section 8",
            "title": "Prohibition of Registration of Certain Indications",
            "text": "A geographical indication the use of which would be likely to deceive or cause confusion, or contrary to any law, or devoid of distinctiveness, shall not be registered.",
            "score": 0.86
        }
    ],
    "plant_varieties": [
        {
            "namespace": "plant_varieties",
            "section": "PPV&FR Act, 2001 - Section 15",
            "title": "Criteria for Registration of Plant Varieties (NDUS)",
            "text": "A plant variety must satisfy the criteria of Novelty, Distinctiveness, Uniformity and Stability (NDUS) to qualify for registration under this Act.",
            "score": 0.92
        },
        {
            "namespace": "plant_varieties",
            "section": "PPV&FR Act, 2001 - Section 39",
            "title": "Farmers' Rights Protection",
            "text": "A farmer shall be entitled to save, use, sow, resow, exchange, share or sell his farm produce including seed of a variety protected under this Act, provided that the farmer shall not be entitled to sell branded seed of a variety protected.",
            "score": 0.88
        }
    ],
    "traditional_knowledge": [
        {
            "namespace": "traditional_knowledge",
            "section": "CSIR & AYUSH TKDL Guidelines",
            "title": "Traditional Knowledge Digital Library Prior Art Evidence",
            "text": "TKDL acts as a statutory prior art search repository containing translated documentation from classical Ayurveda, Unani, and Siddha texts to prevent wrongful patent grants on traditional formulations globally.",
            "score": 0.95
        }
    ],
    "copyright": [
        {
            "namespace": "copyright",
            "section": "Copyright Act, 1957 - Section 13",
            "title": "Works in Which Copyright Subsists",
            "text": "Copyright subsists in original literary, dramatic, musical and artistic works, including user instruction packaging, brand artwork, and proprietary operational formulation monographs.",
            "score": 0.90
        }
    ]
}

# {
#     "namespace": namespace,
#     "section": str(section),
#     "title": str(title),
#     "text": content,
#     "score": round(float(pt.score), 4)
# }

# doc schema is defined in core.state

async def _search_single_namespace(
    namespace: str,
    query: str,
    jurisdiction: str,
    genai_client: Optional[genai.Client], # embedding model
    qdrant_client: Optional[AsyncQdrantClient],
    semaphore: asyncio.Semaphore,
    limit_per_namespace: int = 3
) -> List[Dict[str, Any]]: # return a list of chunks
    """
    Retrieves vector candidate chunks for a single namespace with concurrency bounding,
    falling back to statutory knowledge base if Qdrant is unavailable or empty.
    """
    async with semaphore:
        collection_name = "international_law" if jurisdiction == "INT" else "indian_law"
        
        # 1. Try Live Qdrant Vector Retrieval
        #   - get query_vector
        #   - create query_filter
        #   - query the DB
        if genai_client and qdrant_client:
            try:
                emb_res = await genai_client.aio.models.embed_content(
                    model="gemini-embedding-001",
                    contents=query
                )
                query_vector = emb_res.embeddings[0].values

                q_filter = models.Filter(
                    must=[
                        models.FieldCondition(
                            key="namespace",
                            match=models.MatchValue(value=namespace)
                        )
                    ]
                )

                search_res = await qdrant_client.query_points(
                    collection_name=collection_name,
                    query=query_vector,
                    query_filter=q_filter,
                    limit=limit_per_namespace
                )

                if search_res and search_res.points:
                    docs:list[doc] = []
                    for pt in search_res.points:
                        p = pt.payload or {}
                        content = p.get("content", "").strip()
                        if not content:
                            continue
                        section = (
                            p.get("header_Act")
                            or p.get("source_name")
                            or p.get("monograph_number")
                            or p.get("document_title")
                            or f"{namespace.title()} Provision"
                        )
                        title = p.get("header_Act") or p.get("domain") or p.get("document_type") or "Statutory Law"
                        docs.append({
                            "namespace": namespace,
                            "section": str(section),
                            "title": str(title),
                            "text": content,
                            "score": round(float(pt.score), 4)
                        })
                        # also add  'act_year', 'amendment_year', so that we can prefer latest acts
                    if docs:
                        return docs

            except Exception as e:
                print(f"[async_db_search]: Live Qdrant lookup failed for '{namespace}': {e}. Using statutory fallback.")

        # 2. Resilient Statutory Fallback
        fallback = STATUTORY_FALLBACK_CORPUS.get(namespace)
        if fallback:
            return fallback[:limit_per_namespace]
        
        # Generic safety fallback
        return [{
            "namespace": namespace,
            "section": f"{namespace.title()} Statutory Provisions",
            "title": f"{namespace.title()} General Legal Provisions",
            "text": f"Relevant statutory compliance provisions governing {namespace} under Indian IPR and AYUSH regulations.",
            "score": 0.75
        }]


async def async_db_search_node(state: GraphState) -> Dict[str, Any]:
    """
    RAG Subgraph Node: Concurrently queries vector collections across selected namespaces.
    Applies Plan 2:
    - Bounded by asyncio.Semaphore(5)
    - Fetches top candidates per namespace
    - Pools chunks globally, sorts by similarity score, and caps at top N (6) chunks
    - Resilient fallback for any offline/unavailable namespace
    """
    refined_queries: Dict[str, str] = state.get("refined_queries", {})
    if not refined_queries:# make base_query as refined query for each namespace
        selected_ns = state.get("selected_namespaces") or ["patents"]
        base_query = state.get("rewritten_query") or state.get("user_query", "")
        refined_queries = {ns: base_query for ns in selected_ns}

    jurisdiction = state.get("jurisdiction", "IN")

    # Initialize API Clients
    google_key = settings.google_api_key or os.getenv("GOOGLE_API_KEY")
    qdrant_url = settings.qdrant_url or os.getenv("QDRANT_URL")
    qdrant_key = settings.qdrant_api_key or os.getenv("QDRANT_API_KEY")

    genai_client = genai.Client(api_key=google_key) if google_key else None
    qdrant_client = AsyncQdrantClient(url=qdrant_url, api_key=qdrant_key, timeout=8.0) if qdrant_url else None

    # Semaphore: Cap at 5 concurrent search tasks
    semaphore = asyncio.Semaphore(5)

    tasks = [
        _search_single_namespace(
            namespace=ns,
            query=q,
            jurisdiction=jurisdiction,
            genai_client=genai_client,
            qdrant_client=qdrant_client,
            semaphore=semaphore,
            limit_per_namespace=3
        )
        for ns, q in refined_queries.items()
    ]

    all_namespace_results = await asyncio.gather(*tasks)

    # Two-Tier Global Reranking: Pool all chunks across all queried namespaces
    pooled_chunks: List[Dict[str, Any]] = []
    seen_texts = set()

    for chunk_list in all_namespace_results:
        for chunk in chunk_list:
            # Simple content fingerprint to avoid duplicates 
            # use sha-256 string to check for duplicate content. I'll soon add sha-256 key to each chunk on cloud till now this is fine
            snippet = chunk.get("text", "")[:80]
            if snippet not in seen_texts:
                seen_texts.add(snippet)
                pooled_chunks.append(chunk)

    # Global sort across all namespaces by score descending
    pooled_chunks.sort(key=lambda x: x.get("score", 0.0), reverse=True)

    # Top-N cap: Maximum 6 dense statutory chunks to prevent generator context bloating
    MAX_GLOBAL_CHUNKS = 6
    top_ranked_docs = pooled_chunks[:MAX_GLOBAL_CHUNKS]

    print(f"\n--- [RAG: async_db_search] Concurrent Two-Tier Vector Search ---")
    print(f"   Queried Namespaces: {list(refined_queries.keys())}")
    print(f"   Total Candidate Chunks Pooled: {len(pooled_chunks)}")
    print(f"   Top-Ranked Chunks Retained: {len(top_ranked_docs)}")
    for doc in top_ranked_docs:
        print(f"   -> [{doc.get('namespace')}] {doc.get('section')} (Score: {doc.get('score')})")

    return {
        "retrieved_docs": top_ranked_docs
    }
