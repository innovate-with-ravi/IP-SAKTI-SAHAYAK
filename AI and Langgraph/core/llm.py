"""Resilient Model Factory with fallback providers.

Python implementation of the multi-provider fallback architecture from model.ts.
Supports:
1. Groq (Ultra-fast inference: qwen/qwen3.8-27b, openai/gpt-oss-120b)
2. Google GenAI (gemini-3.8-flash)
"""

import os
from typing import Type, List, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_core.runnables import Runnable
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from core.config import settings

load_dotenv()

def create_models() -> List[Runnable]:
    """
    Creates available LLM instances ordered by priority.
    Primary: Groq (Fast, low-latency for routing & classification)
    Secondary: Groq secondary model
    Fallback: Google GenAI (gemini-3.8-flash)
    """
    models = []

    # 1. Groq Primary (Ultra-low latency, highly reliable)
    groq_key = settings.groq_api_key or os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            models.append(
                ChatGroq(
                    model="qwen/qwen3.8-27b",
                    api_key=groq_key,
                    temperature=0,
                    max_tokens=8192,
                    max_retries=1
                )
            )
            # Secondary Groq model as backup
            models.append(
                ChatGroq(
                    model="openai/gpt-oss-120b",
                    api_key=groq_key,
                    temperature=0,
                    max_tokens=8192,
                    max_retries=1
                )
            )
        except Exception:
            print("[llm.py - create_models()]: Error in creating groq model instances")

    # 2. Google GenAI Fallback
    google_key = settings.google_api_key or os.getenv("GOOGLE_API_KEY")
    if google_key:
        try:
            models.append(
                ChatGoogleGenerativeAI(
                    model="gemini-3.8-flash",
                    api_key=google_key,
                    temperature=0,
                    max_output_tokens=8192,
                    max_retries=1
                )
            )
        except Exception:
            print("[llm.py - create_models()]: Error in creating gemini model instances")

    if not models:
        raise ValueError("[llm.py - create_models()]: No LLM providers available. Please set GROQ_API_KEY or GOOGLE_API_KEY in .env")

    return models

def get_resilient_model() -> Runnable:
    """
    Returns primary model wrapped with fallback models for standard text generation.
    """
    models = create_models()
    primary = models[0]
    fallbacks = models[1:]
    if fallbacks:
        return primary.with_fallbacks(fallbacks)
    return primary

def get_resilient_structured_model(schema: Type[BaseModel]) -> Runnable:
    """
    Returns a resilient model bound to a Pydantic schema for structured output.
    Applies .with_structured_output to each model individually BEFORE setting up fallbacks.
    (Different providers format structured output differently under the hood).
    """
    models = create_models()
    structured_models = []

    for m in models:
        try:
            structured_models.append(m.with_structured_output(schema))
        except Exception:
            continue

    if not structured_models:
        raise ValueError(f"Failed to bind schema {schema.__name__} to any available LLM.")

    primary = structured_models[0]
    fallbacks = structured_models[1:]
    if fallbacks:
        return primary.with_fallbacks(fallbacks)
    return primary
