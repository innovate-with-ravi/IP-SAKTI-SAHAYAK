"""Graph state definitions for the IP-SAKTI Sahayak LangGraph workflow."""
from typing import Annotated, List, Dict, Any, Optional
from typing_extensions import TypedDict
import operator

class doc(TypedDict, total=False):
    namespace: str
    section: str
    title: str
    text: str
    score: float
    act: Optional[str]
    amendment_year: Optional[str]


class GraphState(TypedDict, total=False):
    """
    Central State passed through all nodes in the IP-SAKTI Sahayak graph.
    """
    # 1. User Input & Session Metadata
    user_query: str
    chat_history: Annotated[List[Dict[str, Any]], operator.add]
    jurisdiction: str  # "IN" (India) or "INT" (International)
    language: str      # e.g., "en", "hi", etc.

    # 2. Gatekeeper State
    is_safe: bool
    guardrail_reason: Optional[str]
    route_path: Optional[str]  # "path_a", "path_b", "path_c"

    # 3. Path Execution & Classification State
    rewritten_query: Optional[str]
    formulation_category: Optional[str]  # e.g., "classical", "proprietary", "phytopharmaceutical", "aahar_food", "cosmetic", "new_drug"
    needs_clarification: bool
    clarification_questions: List[str]
    clarification_history: List[Dict[str, list[str]|str]]  # [{"questions": [...], "answer": "..."}]
    clarification_attempts: int                  # 0 to 3 safety circuit breaker

    # 4. RAG Subgraph State
    selected_namespaces: List[str]        # e.g., ["patents_act_2024", "biodiversity_act_2023", "fssai_aahar"]
    refined_queries: Dict[str, str]       # { "patents_act_2024": "query...", "biodiversity_act_2023": "query..." }
    retrieved_docs: List[doc]  # Legal chunks fetched in parallel
    crag_passed: bool                     # Single-pass CRAG evaluation
    helper_warnings: List[str]            # Deterministic TKDL / ABS compliance rules injected by Helper Injection

    # 5. Final Output State
    final_answer: str
    citations: List[Dict[str, str]]       # Structured citations: statute, rule, section, url
    confidence_score: float               # Confidence metric (0.0 to 1.0)
