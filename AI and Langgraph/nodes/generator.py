"""Node: Final Generator & Synthesizer.

Synthesizes validated statutory context, mandatory helper compliance warnings,
and user query into an authoritative legal response with citations and confidence score.
"""

from typing import Dict, Any, List
from pydantic import BaseModel, Field
from langchain_core.messages import AIMessage
from core.state import GraphState
from core.prompts import get_generator_prompt
from core.llm import get_resilient_structured_model, get_resilient_model, create_models
class GeneratorOutput(BaseModel):
    """Structured response schema for legal generator."""
    final_answer: str = Field(
        description="Comprehensive, authoritative legal and regulatory guidance with clear markdown structure."
    )
    citations: List[Dict[str, str]] = Field(
        default_factory=list,
        description="List of formal legal citations: statute, section, and summary of relevance."
    ) # update citation for each chunk with source link (i.e. add {citation: source-link} to each chunk's metadata) in qdrant database, then deterministically (python) add citations or we can use llm to specify exact line of piece of text referenced. For now it's fine or we can remove citations for now!!!
    confidence_score: float = Field(
        default=0.95,
        description="Estimated confidence score between 0.0 and 1.0 based on grounding in official statutory text."
    ) # we'll later calculate this deterministically too in helper injection node

from langchain_core.runnables import RunnableConfig
from langgraph.types import StreamWriter

async def generator_node(state: GraphState, config: RunnableConfig = None, writer: StreamWriter = None) -> Dict[str, Any]:
    """
    Synthesizes retrieved legal context and mandatory helper warnings into an authoritative answer.
    """
    # 1. Check if query was previously rejected by guardrail
    is_safe = state.get("is_safe", True)
    if not is_safe:
        guardrail_reason = state.get("guardrail_reason") or "This query falls outside the permissible scope of Ayurvedic IPR and regulatory assistance."
        abstention_message = (
            f"**Notice: Request Out of Scope**\n\n"
            f"{guardrail_reason}\n\n"
            f"*Disclaimer: IP-SAKTI Sahayak assists strictly with Ayurvedic intellectual property (patents, trademarks, designs, GI, TKDL) and drug regulatory compliance (Drugs & Cosmetics Act, FSSAI Ayurveda Aahara, Biodiversity Act ABS).*"
        )
        return {
            "final_answer": abstention_message,
            "citations": [],
            "confidence_score": 1.0,
            "messages": [AIMessage(content=abstention_message)]
        }

    # 2. Extract context and state parameters
    user_query = state.get("rewritten_query") or state.get("user_query", "")
    jurisdiction = state.get("jurisdiction", "IN")
    category = state.get("formulation_category", "classical")
    helper_warnings = state.get("helper_warnings") or []
    retrieved_docs = state.get("retrieved_docs") or []

    # Format retrieved legal documents into clean readable text for prompt
    formatted_context_list = []
    for idx, doc in enumerate(retrieved_docs, start=1):
        sec = doc.get("section", "Statutory Provision")
        title = doc.get("title", "")
        text = doc.get("text", "")
        score = doc.get("score", "")
        formatted_context_list.append(f"[{idx}] {sec} - {title} (Relevance Score: {score}):\n{text}")

    context_str = "\n\n".join(formatted_context_list) if formatted_context_list else "No direct statutory matches found in vector index."
    warnings_str = "\n".join(f"- {w}" for w in helper_warnings) if helper_warnings else "None"

    # 3. Invoke resilient models with direct astream for token streaming
    prompt = get_generator_prompt()
    formatted_messages = await prompt.ainvoke({
        "jurisdiction": jurisdiction,
        "formulation_category": category,
        "helper_warnings": warnings_str,
        "context": context_str,
        "user_query": user_query
    })

    models = create_models()
    final_answer = ""
    stream_succeeded = False

    for model in models:
        try:
            chunks: List[str] = []
            async for chunk in model.astream(formatted_messages, config=config):
                c = chunk.content if hasattr(chunk, "content") else str(chunk)
                text_piece = ""
                if isinstance(c, str) and c:
                    text_piece = c
                    chunks.append(c)
                elif isinstance(c, list):
                    for part in c:
                        if isinstance(part, str):
                            text_piece += part
                            chunks.append(part)
                        elif isinstance(part, dict) and "text" in part:
                            text_piece += part["text"]
                            chunks.append(part["text"])
                if text_piece and writer is not None:
                    try:
                        writer({"text": text_piece})
                    except Exception:
                        pass

            full_text = "".join(chunks).strip()
            if full_text:
                final_answer = full_text
                stream_succeeded = True
                print(f"[generator_node]: Successfully streamed output with model: {getattr(model, 'model_name', type(model).__name__)}")
                break
        except Exception as e:
            print(f"[generator_node]: astream error with model {getattr(model, 'model_name', type(model).__name__)}: {e}. Trying fallback model...")
            continue

    # 4. Fallback if all resilient models fail
    if not stream_succeeded or not final_answer.strip():
        print(f"[generator_node]: Total fallback triggered across all models.")
        final_answer = (
            f"Based on the analysis of your inquiry regarding '{user_query}' for a {category} product:\n\n"
            f"1. **Statutory Guidance**: Under applicable Indian regulatory provisions, formulation compliance is strictly governed by the Drugs and Cosmetics Act, 1940 and Patent Act, 1970.\n"
            f"2. **Mandatory Compliance**:\n{warnings_str}\n\n"
            f"Disclaimer: This guidance is provided for informational and educational purposes only and does not constitute legal advice."
        )

    # Ensure citations exist from retrieved docs
    citations = [
        {
            "statute": doc.get("section", "Statutory Provision"),
            "section": doc.get("title", ""),
            "relevance": doc.get("text", "")[:120].strip()
        }
        for doc in retrieved_docs[:4]
    ]

    final_answer = str(final_answer).strip()

    print(f"\n--- [NODE: generator] Legal Guidance Synthesized (Token Streamed) ---")
    print(f"   Answer Length: {len(final_answer)} chars")
    print(f"   Citations Count: {len(citations)}")
    print(f"   Confidence Score: 0.95")

    return {
        "final_answer": final_answer,
        "citations": citations,
        "confidence_score": 0.95,
        "messages": [AIMessage(content=final_answer)]
    }
