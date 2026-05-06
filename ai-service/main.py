from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from azure.cognitiveservices.vision.computervision.models import OperationStatusCodes
from msrest.authentication import CognitiveServicesCredentials
import pytesseract
import time
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
import io
import os
import gc

app = FastAPI(title="Notely OCR Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AZURE_VISION_KEY = os.environ.get("AZURE_VISION_KEY")
AZURE_VISION_ENDPOINT = os.environ.get("AZURE_VISION_ENDPOINT")
AZURE_VISION_PRESENT = bool(AZURE_VISION_KEY and AZURE_VISION_ENDPOINT)

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


@app.post("/summarize")
async def summarize_text(request: dict):
    try:
        text = request.get("text", "")
        if not text or len(text.strip()) < 20:
            return {"summary": ""}

        import re
        from collections import Counter

        # Strip HTML
        clean = re.sub(r'<[^>]+>', ' ', text)
        clean = re.sub(r'\s+', ' ', clean).strip()

        if len(clean) < 20:
            return {"summary": ""}

        # Split sentences
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', clean)
                     if len(s.strip()) > 8]

        if not sentences:
            words = clean.split()[:50]
            return {"summary": ' '.join(words)}

        # Stop words
        stop = {'the','a','an','and','or','but','in','on','at','to','for',
                'of','with','by','from','is','are','was','were','be','been',
                'have','has','had','do','does','did','will','would','could',
                'should','may','might','this','that','these','those','it',
                'its','we','i','you','he','she','they','their','our','my'}

        # Word frequency
        all_words = re.findall(r'\b[a-z]+\b', clean.lower())
        freq = Counter(w for w in all_words if w not in stop)

        def score(s):
            words = re.findall(r'\b[a-z]+\b', s.lower())
            if not words: return 0
            return sum(freq.get(w,0) for w in words if w not in stop)/len(words)

        # Sort by score
        ranked = sorted(enumerate(sentences), key=lambda x: score(x[1]),
                       reverse=True)

        # Build summary — add whole sentences until 50 words
        result = []
        word_count = 0

        for _, sentence in ranked:
            w = len(sentence.split())
            if word_count + w <= 50:
                result.append(sentence)
                word_count += w
            if word_count >= 30:
                break

        if not result:
            result = [sentences[0]]

        # Sort by original order
        orig_order = {s: i for i, s in enumerate(sentences)}
        result.sort(key=lambda s: orig_order.get(s, 0))

        summary = ' '.join(result)
        return {"summary": summary}

    except Exception as e:
        print(f"Summarize error: {str(e)}")
        return {"summary": ""}


@app.get("/")
def health_check():
    return {"status": "healthy", "model": "Azure Computer Vision OCR"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/extract-text")
async def extract_text(
    file: UploadFile = File(...),
    image_type: str = Query(default="auto"),
    lang: str = Query(default="eng"),
    source: str = Query(default="upload"),
):
    try:
        contents = await file.read()
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
                print(f"Azure Vision error: {str(e)}")

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
