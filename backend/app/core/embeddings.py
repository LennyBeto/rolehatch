# backend/app/core/embeddings.py
import asyncio
import google.generativeai as genai
from app.core.config import settings

EMBEDDING_MODEL = "models/text-embedding-004"
EMBEDDING_DIM = 768

genai.configure(api_key=settings.google_api_key)


async def embed_text(text: str) -> list[float] | None:
    """Embed a piece of text for cosine-similarity matching.

    Returns None on any failure — callers must degrade gracefully (skip
    match scoring for that job/resume) rather than fail the sync or save.
    Runs the blocking SDK call in a thread so it doesn't stall the event loop.
    """
    if not text or not text.strip():
        return None
    truncated = text[:8000]  # keep well under the model's input limit
    try:
        result = await asyncio.to_thread(
            genai.embed_content,
            model=EMBEDDING_MODEL,
            content=truncated,
            task_type="SEMANTIC_SIMILARITY",
        )
        return result["embedding"]
    except Exception:
        return None