from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from azure.cognitiveservices.vision.computervision.models import OperationStatusCodes
from msrest.authentication import CognitiveServicesCredentials
from groq import Groq
import pytesseract
import time
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
import io
import os
import gc

from embeddings import get_provider, chunk_note, build_embed_text

app = FastAPI(title="Notely OCR Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# strip() guards against trailing newlines / surrounding quotes that Railway
# env vars commonly carry — a whitespace-tainted endpoint produces a malformed
# Azure client URL and silent OCR failures.
AZURE_VISION_KEY = (os.environ.get("AZURE_VISION_KEY") or "").strip().strip('"').strip("'")
AZURE_VISION_ENDPOINT = (os.environ.get("AZURE_VISION_ENDPOINT") or "").strip().strip('"').strip("'")
AZURE_VISION_PRESENT = bool(AZURE_VISION_KEY and AZURE_VISION_ENDPOINT)
print(f"Azure Vision configured: {AZURE_VISION_PRESENT} (endpoint set: {bool(AZURE_VISION_ENDPOINT)}, key set: {bool(AZURE_VISION_KEY)})")

# Groq summarization. Same strip() guard for Railway-tainted env vars.
GROQ_API_KEY = (os.environ.get("GROQ_API_KEY") or "").strip().strip('"').strip("'")
GROQ_PRESENT = bool(GROQ_API_KEY)
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_PRESENT else None
print(f"Groq summarization configured: {GROQ_PRESENT}")

# Summary length presets -> target word count (prompt aims for these).
SUMMARY_LENGTHS = {"short": 15, "medium": 35, "detailed": 60}
# Prompts now say "at least / aim for N", so the truncate cap needs headroom
# above the target — otherwise output landing slightly over N gets clipped.
SUMMARY_CAP_RATIO = 1.5
SUMMARY_MODEL = "llama-3.1-8b-instant"

PSM_MODES = {
    "auto": 3,
    "document": 6,
    "screenshot": 6,
    "photo": 11,
    "sparse": 11,
}


def preprocess_image(image: Image.Image, source: str = "upload") -> Image.Image:
    """Enhanced preprocessing for better OCR accuracy"""

    # 1. Handle transparency (composite on white)
    if image.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', image.size, (255, 255, 255))
        if image.mode == 'P':
            image = image.convert('RGBA')
        background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
        image = background

    # 2. Convert to grayscale
    if image.mode != 'L':
        image = image.convert('L')

    # 3. Upscaling — smarter minimum size for canvas to improve thin stroke visibility
    if source == "canvas":
        current_max = max(image.width, image.height)
        if current_max < 1500:
            scale = 1500 / current_max
            new_size = (int(image.width * scale), int(image.height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
    else:
        if image.width < 800:
            scale = min(2.0, 800 / image.width)
            new_size = (int(image.width * scale), int(image.height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)

    # 4. For canvas: thicken thin pen strokes before contrast boost
    if source == "canvas":
        image = image.filter(ImageFilter.MaxFilter(size=3))
    else:
        # Denoise (reduce pencil texture, paper grain) — skip for canvas to preserve strokes
        image = image.filter(ImageFilter.MedianFilter(size=3))

    # 5. Contrast boost — stronger for canvas handwriting
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(3.0 if source == "canvas" else 2.0)

    # 6. Sharpen edges
    image = image.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))

    # 7. Normalize brightness
    enhancer = ImageEnhance.Brightness(image)
    image = enhancer.enhance(1.1)

    # 8. Thresholding for canvas drawings — Otsu-style using mean
    if source == "canvas":
        img_array = np.array(image, dtype=np.uint8)
        threshold = int(img_array.mean() * 0.8)
        binary = img_array < threshold  # dark pixels = ink
        result = np.where(binary, 0, 255).astype(np.uint8)
        image = Image.fromarray(result)
        del img_array, binary, result
        gc.collect()

    gc.collect()
    return image


def get_tesseract_config(image_type: str = "auto") -> str:
    psm = PSM_MODES.get(image_type, PSM_MODES["auto"])
    return f"--oem 3 --psm {psm}"


def _truncate_words(text: str, max_words: int) -> str:
    """Hard cap word count. Safety net for model overshoot / extractive sentences."""
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]).rstrip(",;:") + "…"


def _extractive_summary(clean: str, max_words: int) -> str:
    """Frequency-based extractive fallback when Groq is unavailable."""
    import re
    from collections import Counter

    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', clean)
                 if len(s.strip()) > 8]
    if not sentences:
        return ' '.join(clean.split()[:max_words])

    stop = {'the','a','an','and','or','but','in','on','at','to','for',
            'of','with','by','from','is','are','was','were','be','been',
            'have','has','had','do','does','did','will','would','could',
            'should','may','might','this','that','these','those','it',
            'its','we','i','you','he','she','they','their','our','my'}

    all_words = re.findall(r'\b[a-z]+\b', clean.lower())
    freq = Counter(w for w in all_words if w not in stop)

    def score(s):
        words = re.findall(r'\b[a-z]+\b', s.lower())
        if not words:
            return 0
        return sum(freq.get(w, 0) for w in words if w not in stop) / len(words)

    ranked = sorted(enumerate(sentences), key=lambda x: score(x[1]), reverse=True)

    result = []
    word_count = 0
    soft_floor = max(1, int(max_words * 0.6))
    for _, sentence in ranked:
        w = len(sentence.split())
        if word_count + w <= max_words:
            result.append(sentence)
            word_count += w
        if word_count >= soft_floor:
            break

    if not result:
        result = [sentences[0]]

    orig_order = {s: i for i, s in enumerate(sentences)}
    result.sort(key=lambda s: orig_order.get(s, 0))
    return _truncate_words(' '.join(result), max_words)


@app.post("/summarize")
async def summarize_text(request: dict):
    try:
        text = request.get("text", "")
        length = str(request.get("length") or "medium").lower()
        max_words = SUMMARY_LENGTHS.get(length, SUMMARY_LENGTHS["medium"])
        cap_words = int(max_words * SUMMARY_CAP_RATIO)

        if not text or len(text.strip()) < 20:
            return {"summary": ""}

        import re
        clean = re.sub(r'<[^>]+>', ' ', text)
        clean = re.sub(r'\s+', ' ', clean).strip()
        if len(clean) < 20:
            return {"summary": ""}

        # Primary: Groq with an explicit word-count constraint.
        if groq_client:
            try:
                completion = groq_client.chat.completions.create(
                    model=SUMMARY_MODEL,
                    max_tokens=max_words * 6 + 32,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are a summarization engine. "
                                f"Write a summary of the user's note that is AT LEAST {max_words} words; "
                                f"aim for {max_words} words. "
                                "Capture the key points. "
                                "Output only the summary text — no preamble, no quotes, "
                                "no labels, no markdown, no trailing period commentary."
                            ),
                        },
                        {"role": "user", "content": clean},
                    ],
                )
                summary = (completion.choices[0].message.content or "").strip()
                summary = _truncate_words(summary, cap_words)
                if summary:
                    return {"summary": summary, "engine": "groq", "length": length}
                print("Groq returned empty summary — using extractive fallback")
            except Exception as e:
                print(f"Groq summarize error: {type(e).__name__}: {str(e)}")
        else:
            print("Groq NOT configured — using extractive fallback (set GROQ_API_KEY)")

        # Fallback: extractive NLP
        return {
            "summary": _extractive_summary(clean, cap_words),
            "engine": "extractive",
            "length": length,
        }

    except Exception as e:
        print(f"Summarize error: {str(e)}")
        return {"summary": ""}


@app.get("/")
def health_check():
    return {"status": "healthy", "model": "Azure Computer Vision OCR"}


@app.get("/health")
def health():
    return {"status": "healthy"}


# ── Knowledge Engine: embedding generation (M1) ──────────────────────
# Internal, service-to-service only (called by the backend, like
# /summarize and /extract-text). Not a public client API. No retrieval.

@app.post("/embed")
async def embed(request: dict):
    """Embed raw texts. type = "passage" (default) | "query"."""
    texts = request.get("texts") or []
    kind = str(request.get("type") or "passage").lower()
    provider = get_provider()
    try:
        vectors = (provider.embed_queries(texts) if kind == "query"
                   else provider.embed_passages(texts))
    except Exception as e:
        print(f"Embed error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=503, detail="Embedding model unavailable")
    return {"model": provider.model_id, "dim": provider.dim, "vectors": vectors}


@app.post("/embed-note")
async def embed_note(request: dict):
    """Chunk a note and embed each chunk (passage embeddings) for storage.

    Body: {title, content}. Returns per-chunk content + 384-dim vector.
    The backend persists these; this service holds no state.
    """
    title = request.get("title") or ""
    content = request.get("content") or ""
    provider = get_provider()

    chunks = chunk_note(title, content)
    if not chunks:
        return {"model": provider.model_id, "dim": provider.dim, "chunks": []}

    try:
        embed_texts = [build_embed_text(title, c["content"]) for c in chunks]
        vectors = provider.embed_passages(embed_texts)
    except Exception as e:
        print(f"Embed-note error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=503, detail="Embedding model unavailable")

    out = [
        {
            "index": c["index"],
            "content": c["content"],
            "tokenCount": c["tokenCount"],
            "vector": v,
        }
        for c, v in zip(chunks, vectors)
    ]
    print(f"Embedded note: {len(out)} chunk(s), model={provider.model_id}")
    return {"model": provider.model_id, "dim": provider.dim, "chunks": out}


@app.post("/extract-text")
async def extract_text(
    file: UploadFile = File(...),
    image_type: str = Query(default="auto"),
    lang: str = Query(default="eng"),
    source: str = Query(default="upload"),
):
    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty image upload")
        print(f"Received {len(contents)} bytes for OCR (source={source})")
        image = Image.open(io.BytesIO(contents))

        # Apply enhanced preprocessing
        processed = preprocess_image(image, source)

        result = None

        # Use Azure Computer Vision as primary
        if AZURE_VISION_PRESENT:
            print("Using Azure Computer Vision")
            try:
                client = ComputerVisionClient(
                    AZURE_VISION_ENDPOINT,
                    CognitiveServicesCredentials(AZURE_VISION_KEY)
                )

                img_byte_arr = io.BytesIO()
                processed.save(img_byte_arr, format='PNG')
                img_byte_arr.seek(0)
                sent_bytes = img_byte_arr.getbuffer().nbytes
                print(f"Sending {sent_bytes} bytes to Azure Read API")
                if sent_bytes == 0:
                    raise ValueError("Processed image produced 0 bytes — nothing to send to Azure")

                # Use Read API for better handwriting support
                read_response = client.read_in_stream(img_byte_arr, raw=True)
                operation_location = read_response.headers["Operation-Location"]
                operation_id = operation_location.split("/")[-1]

                # Poll for result
                max_tries = 10
                for i in range(max_tries):
                    read_result = client.get_read_result(operation_id)
                    if read_result.status not in [OperationStatusCodes.running, OperationStatusCodes.not_started]:
                        break
                    time.sleep(1)

                full_text = ""
                words = []
                if read_result.status == OperationStatusCodes.succeeded:
                    for page in read_result.analyze_result.read_results:
                        for line in page.lines:
                            full_text += line.text + "\n"
                            for word in line.words:
                                words.append({
                                    "text": word.text,
                                    "confidence": round(word.confidence * 100, 1)
                                })

                avg_confidence = sum(w["confidence"] for w in words) / len(words) if words else 0

                result = {
                    "text": full_text.strip(),
                    "confidence": round(avg_confidence, 1),
                    "words": words,
                    "engine": "azure_vision"
                }
            except Exception as e:
                import traceback
                print(f"Azure Vision error: {type(e).__name__}: {str(e)}")
                traceback.print_exc()
        else:
            print("Azure Vision NOT configured — check AZURE_VISION_KEY / AZURE_VISION_ENDPOINT env vars on Railway")

        # Fallback to Tesseract
        if not result:
            print("Using Tesseract fallback")
            config = get_tesseract_config(image_type)
            text = pytesseract.image_to_string(processed, lang=lang, config=config)
            result = {
                "text": text.strip(),
                "confidence": None,
                "words": [],
                "engine": "tesseract"
            }

        return {
            "success": True,
            "filename": file.filename,
            "text": result["text"],
            "engine": result.get("engine"),
            "confidence": result.get("confidence"),
            "words": result.get("words", []),
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail="OCR processing failed")
