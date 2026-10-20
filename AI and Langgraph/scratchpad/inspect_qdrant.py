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
    cols = await client.get_collections() # get all the collections of the DB
    for col in cols.collections:
        name = col.name
        try:
            info = await client.get_collection(name)
            points, _ = await client.scroll(name, limit=1, with_payload=True)
            print(f"Collection: {name} | Points: {info.points_count}")
            if points:
                p = points[0]
                print(f"  Sample ID: {p.id}")
                print(f"  Payload Keys: {list(p.payload.keys()) if p.payload else None}")
                if p.payload:
                    print(f"  Snippet: {str(p.payload)[:200]}")
        except Exception as e:
            print(f"Error for {name}: {e}")

asyncio.run(inspect())
