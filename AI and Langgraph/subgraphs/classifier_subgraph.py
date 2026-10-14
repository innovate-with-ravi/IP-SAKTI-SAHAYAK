"""Formulation Classifier Subgraph (Path C).

Encapsulates:
- Formulation Evaluator (Pure Brain): Runs LLM evaluation and category classification.
- Clarification Pause (Pure HITL): Pauses execution via interrupt() without side effects or duplicate LLM invocations.
"""

from langgraph.graph import StateGraph, START, END
from core.state import GraphState
from nodes.classifier import (
    formulation_evaluator_node,
    clarification_pause_node,
    route_classifier_flow
)

def create_formulation_subgraph() -> StateGraph:
    """
    Constructs the encapsulated Formulation Classifier Subgraph:
    START -> formulation_evaluator -> (if ambiguous) -> clarification_pause -> formulation_evaluator (not ambiguous)-> END.
    """
    subgraph = StateGraph(GraphState)

    # 1. Add Subgraph Nodes
    subgraph.add_node("formulation_evaluator", formulation_evaluator_node)
    subgraph.add_node("clarification_pause", clarification_pause_node)

    # 2. Add Subgraph Flow Edges
    subgraph.add_edge(START, "formulation_evaluator")

    subgraph.add_conditional_edges(
        "formulation_evaluator",
        route_classifier_flow,
        {
            "clarification_pause": "clarification_pause",
            "__end__": END
        }
    )

    # Loop back to evaluator once clarification answer is collected
    subgraph.add_edge("clarification_pause", "formulation_evaluator")

    return subgraph.compile()
