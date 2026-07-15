"""Embedding generation for the Jot It Knowledge Engine (M1).

Design: docs/KNOWLEDGE_ENGINE.md §5 (embedding pipeline) and §6 (chunking).

The EmbeddingProvider abstraction isolates the model so it can be swapped
without touching any consumer. The default provider is
BAAI/bge-small-en-v1.5 served locally via fastembed (ONNX runtime, no
torch) — 384-dim, normalized. This module does NOT do retrieval, search,
chat, or RAG. It only turns note text into stored-ready chunk vectors.
"""

from abc import ABC, abstractmethod
import re
import math

# ── Chunking config (KNOWLEDGE_ENGINE.md §6) ─────────────────────────
CHUNK_TARGET_TOKENS = 256
OVERLAP_RATIO = 0.15
# Word-count → token heuristic (real tokenizer not needed for sizing).
_TOKENS_PER_WORD = 1.3


def _approx_tokens(text: str) -> int:
    return max(1, round(len(text.split()) * _TOKENS_PER_WORD))


def _strip_html(text: str) -> str:
    # Notes store rich HTML (contenteditable innerHTML). Reduce to plain text.
    return re.sub(r"<[^>]+>", " ", text or "")


def _normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _sentence_split(text: str):
    return [s for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def chunk_note(title: str, content: str):
    """Split a note into retrieval-sized chunks.

    Returns a list of {index, content, tokenCount}. `content` is the chunk
    text WITHOUT the title; callers prepend the title before embedding
    (title carries topic — cheap recall boost). Deterministic: same input
    → same chunks, so the backend's content-hash dirty-check stays stable.
    """
    plain = _normalize_ws(_strip_html(content))
    if not plain:
        return []

    # Short-note fast path — the majority of notes are one chunk.
    if _approx_tokens(plain) <= CHUNK_TARGET_TOKENS:
        return [{"index": 0, "content": plain, "tokenCount": _approx_tokens(plain)}]

    sentences = _sentence_split(plain)
    overlap_tokens = int(CHUNK_TARGET_TOKENS * OVERLAP_RATIO)

    chunks = []
    cur, cur_tokens, idx = [], 0, 0
    for sent in sentences:
        st = _approx_tokens(sent)
        if cur and cur_tokens + st > CHUNK_TARGET_TOKENS:
            chunks.append({"index": idx, "content": " ".join(cur), "tokenCount": cur_tokens})
            idx += 1
            # Carry a tail of sentences (~overlap_tokens) into the next chunk.
            tail, tail_tokens = [], 0
            for s2 in reversed(cur):
                s2t = _approx_tokens(s2)
                if tail_tokens + s2t > overlap_tokens:
                    break
                tail.insert(0, s2)
                tail_tokens += s2t
            cur, cur_tokens = tail[:], tail_tokens
        cur.append(sent)
        cur_tokens += st

    if cur:
        chunks.append({"index": idx, "content": " ".join(cur), "tokenCount": cur_tokens})
    return chunks


def build_embed_text(title: str, chunk_content: str) -> str:
    """Text actually fed to the model: title prepended for recall."""
    title = (title or "").strip()
    return f"{title}. {chunk_content}" if title else chunk_content


# ── Provider abstraction (swappable model) ───────────────────────────
class EmbeddingProvider(ABC):
    """A source of text embeddings. Consumers depend on this, never on a
    concrete model, so models can be swapped without downstream changes."""

    model_id: str = ""
    dim: int = 0

    @abstractmethod
    def embed_passages(self, texts):
        """Embed documents/passages → list[list[float]] (normalized)."""

    @abstractmethod
    def embed_queries(self, texts):
        """Embed search queries → list[list[float]] (normalized).

        Provided for completeness/model-parity; retrieval is out of M1
        scope and this path is not wired to any endpoint yet.
        """


def _l2_normalize(vec):
    total = math.sqrt(sum(x * x for x in vec))
    if total > 0:
        return [x / total for x in vec]
    return list(vec)


class BgeSmallOnnxProvider(EmbeddingProvider):
    """BAAI/bge-small-en-v1.5 via fastembed (ONNX runtime, CPU, no torch).

    Model is lazy-loaded on first embed so service startup stays fast and
    a missing/broken model surfaces as a handled failure, not a crash.
    """

    model_id = "BAAI/bge-small-en-v1.5"
    dim = 384

    def __init__(self):
        self._model = None

    def _get_model(self):
        if self._model is None:
            from fastembed import TextEmbedding  # imported lazily
            self._model = TextEmbedding(model_name=self.model_id)
        return self._model

    def embed_passages(self, texts):
        texts = list(texts or [])
        if not texts:
            return []
        vecs = self._get_model().embed(texts)
        return [_l2_normalize(list(map(float, v))) for v in vecs]

    def embed_queries(self, texts):
        texts = list(texts or [])
        if not texts:
            return []
        vecs = self._get_model().query_embed(texts)
        return [_l2_normalize(list(map(float, v))) for v in vecs]


# ── Singleton accessor ───────────────────────────────────────────────
_provider = None


def get_provider() -> EmbeddingProvider:
    global _provider
    if _provider is None:
        _provider = BgeSmallOnnxProvider()
    return _provider
