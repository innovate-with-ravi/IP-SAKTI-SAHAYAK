import os
from dotenv import load_dotenv
load_dotenv()

from langchain_google_genai import GoogleGenerativeAIEmbeddings
try:
    emb = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004", google_api_key=os.getenv("GOOGLE_API_KEY"))
    vec = emb.embed_query("test")
    print("Google text-embedding-004 len:", len(vec)) # we use 3072 dimensions vector for embedding chunks stored in DB
except Exception as e:
    print("Google emb error:", e)
