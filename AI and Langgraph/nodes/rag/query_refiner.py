"""RAG Subgraph Node: Query Refiner.

Translates the base user intent into specialized, dense legal search queries
tailored specifically to the vocabulary, statutory sections, and legal phrasing
of each target namespace (e.g. patent claims, design shapes, trademark distinctiveness,
AYUSH manufacturing licenses, or FSSAI dietary regulations).
Runs namespace query specializations ""concurrently via asyncio.gather.""
"""

import asyncio
from typing import Dict, Any, List
from pydantic import BaseModel, Field
from core.state import GraphState
from core.prompts import get_query_refiner_prompt
from core.llm import get_resilient_structured_model

class SingleRefinedQueryOutput(BaseModel):
    """Structured output schema for a single specialized legal search query."""
    refined_query: str = Field(
        description="Concise, dense semantic search query optimized for vector matching in this specific legal statute."
    )

async def _refine_single_namespace(
    chain, 
    namespace: str, 
    base_query: str, 
    semaphore: asyncio.Semaphore
) -> tuple[str, str]:
    """Helper to refine query for a single namespace with concurrency bounding and safe fallback."""
    try:
        async with semaphore:
            result: SingleRefinedQueryOutput = await chain.ainvoke({
                "namespace": namespace,
                "query": base_query
            })
            return namespace, result.refined_query
    except Exception as e:
        print(f"[query_refiner_node]: Fallback for '{namespace}' due to error: {e}")
        return namespace, f"{base_query} [{namespace} statutory legal provisions]"

async def query_refiner_node(state: GraphState) -> Dict[str, Any]:
    """
    Concurrently translates user intent into distinct semantic search queries
    tailored specifically to how each selected legal corpus is structured.
    Bounded by an asyncio.Semaphore(5) to prevent API rate limits.
    """
    selected_namespaces: List[str] = state.get("selected_namespaces") or ["patents"]
    base_query: str = state.get("rewritten_query") or state.get("user_query", "")

    prompt = get_query_refiner_prompt()
    model = get_resilient_structured_model(SingleRefinedQueryOutput)
    chain = prompt | model

    # Concurrency capped at 5 simultaneous LLM calls to prevent burst rate limit errors
    semaphore = asyncio.Semaphore(5)
    tasks = [_refine_single_namespace(chain, ns, base_query, semaphore) for ns in selected_namespaces]
    results = await asyncio.gather(*tasks)

    refined_queries: Dict[str, str] = dict(results)

    print(f"\n--- [RAG: query_refiner] Semantic Query Specialization ---")
    for ns, q in refined_queries.items():
        print(f"   -> [{ns}]: \"{q}\"")

    return {
        "refined_queries": refined_queries
    }
