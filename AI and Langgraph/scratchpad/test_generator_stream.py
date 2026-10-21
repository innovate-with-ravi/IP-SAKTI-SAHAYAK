import sys, os
sys.path.insert(0, os.path.abspath("."))
import asyncio
from core.llm import create_models
from core.prompts import get_generator_prompt

async def test_stream():
    prompt = get_generator_prompt()
    formatted = await prompt.ainvoke({
        "jurisdiction": "IN",
        "formulation_category": "classical",
        "helper_warnings": "Mandatory Section 3(p) TKDL check.",
        "context": "DRUGS AND COSMETICS ACT 1940: Classical Ayurvedic formulations are listed under First Schedule authoritative texts.",
        "user_query": "Can I patent an Ayurvedic formulation of Ashwagandha and Giloy?"
    })
    
    models = create_models()
    print(f"Loaded {len(models)} models.")
    
    for i, model in enumerate(models):
        print(f"\n--- Testing Model {i}: {getattr(model, 'model_name', type(model).__name__)} ---")
        try:
            chunks = []
            async for chunk in model.astream(formatted):
                text = chunk.content if hasattr(chunk, "content") else str(chunk)
                if text:
                    chunks.append(text)
                    print(text, end="", flush=True)
            print(f"\nTotal chars received: {sum(len(c) for c in chunks)}")
            break
        except Exception as e:
            print(f"\nModel {i} failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_stream())
