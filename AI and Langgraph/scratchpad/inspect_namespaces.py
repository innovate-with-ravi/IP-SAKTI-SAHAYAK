import os
import asyncio
from dotenv import load_dotenv
from qdrant_client import AsyncQdrantClient

load_dotenv()

async def inspect():
    client = AsyncQdrantClient(
        url=os.getenv("QDRANT_URL"),
        api_key=os.getenv("QDRANT_API_KEY"),
        timeout=10.0
    )
    info = await client.get_collection("indian_law")
    print("Vector config:", info.config.params.vectors)
    
    # Scroll through some points to see namespace values
    points, _ = await client.scroll("indian_law", limit=100, with_payload=True)
    namespaces = set()
    for p in points:
        if p.payload and "namespace" in p.payload:
            namespaces.add(p.payload["namespace"])
    print("Sample namespaces in indian_law:", namespaces)

asyncio.run(inspect())
