"""
rag/retriever.py
----------------
Retrieves relevant mental health documents from ChromaDB
based on a query string and optional risk level filter.
"""

import os
import chromadb
from chromadb.utils import embedding_functions

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(BASE_DIR) == "rag":
    BASE_DIR = os.path.dirname(BASE_DIR)          # src/
if os.path.basename(BASE_DIR) == "src":
    BASE_DIR = os.path.dirname(BASE_DIR)          # mental_health/

CHROMA_PATH     = os.path.join(BASE_DIR, "data", "chroma_db")
COLLECTION_NAME = "mental_health_kb"
EMBED_MODEL     = "sentence-transformers/all-MiniLM-L6-v2"


def get_retriever():
    """Return a ready-to-use retriever object."""
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    ef     = embedding_functions.SentenceTransformerEmbeddingFunction(
                 model_name=EMBED_MODEL
             )
    collection = client.get_collection(
        name=COLLECTION_NAME,
        embedding_function=ef
    )
    return collection


def retrieve(query: str, risk_level: str = None, n_results: int = 3) -> list[dict]:
    """
    Retrieve top-n documents relevant to `query`.

    Parameters
    ----------
    query      : free-text query (e.g. student's message or symptom summary)
    risk_level : optional filter — "Low", "Medium", or "High"
                 (matches the risk_level metadata tag in ChromaDB)
    n_results  : how many documents to return

    Returns
    -------
    List of dicts with keys: text, risk_level, topic, distance
    """
    collection = get_retriever()

    where = {"risk_level": risk_level} if risk_level else None

    results = collection.query(
        query_texts=[query],
        n_results=n_results,
        where=where,
        include=["documents", "metadatas", "distances"]
    )

    docs = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0]
    ):
        docs.append({
            "text":       doc,
            "risk_level": meta.get("risk_level", "Unknown"),
            "topic":      meta.get("topic", "general"),
            "distance":   round(dist, 4)
        })

    return docs


# ── Quick test ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  RETRIEVER TEST")
    print("=" * 60)

    test_cases = [
        ("I feel hopeless and want to hurt myself",  "High"),
        ("I am stressed about exams and can't sleep", "Medium"),
        ("I feel okay but a bit tired sometimes",     "Low"),
    ]

    for query, risk in test_cases:
        print(f"\nQuery  : {query}")
        print(f"Filter : {risk} Risk")
        docs = retrieve(query, risk_level=risk, n_results=2)
        for i, d in enumerate(docs, 1):
            preview = d["text"][:80].replace("\n", " ")
            print(f"  {i}. [{d['risk_level']} / {d['topic']}] {preview}...")

    print("\n[DONE] Retriever working correctly.")
    print("       Next: run src/rag/generator.py")