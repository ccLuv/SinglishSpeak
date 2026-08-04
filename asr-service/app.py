import os
from pathlib import Path
from threading import Lock

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from faster_whisper import WhisperModel

APP_ROOT = Path(__file__).resolve().parent
UPLOAD_ROOT = (APP_ROOT.parent / "backend" / "uploads" / "audio").resolve()
MODEL_NAME = os.getenv("ASR_MODEL", "small")
DEVICE = os.getenv("ASR_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("ASR_COMPUTE_TYPE", "int8" if DEVICE == "cpu" else "int8_float16")

app = FastAPI(title="SinglishSpeak ASR", version="1.0.0")
model = None
model_lock = Lock()


class TranscriptionRequest(BaseModel):
    audioPath: str
    language: str | None = None
    prompt: str | None = None


def get_model() -> WhisperModel:
    global model
    if model is None:
        model = WhisperModel(
            MODEL_NAME,
            device=DEVICE,
            compute_type=COMPUTE_TYPE,
            download_root=str(APP_ROOT / "models"),
        )
    return model


def resolve_uploaded_audio(value: str) -> Path:
    candidate = Path(value).resolve()
    try:
        candidate.relative_to(UPLOAD_ROOT)
    except ValueError as error:
        raise HTTPException(400, "Audio file must be inside backend/uploads/audio") from error
    if not candidate.is_file():
        raise HTTPException(404, "Audio file not found")
    return candidate


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": DEVICE,
        "computeType": COMPUTE_TYPE,
        "modelLoaded": model is not None,
    }


@app.post("/transcribe")
def transcribe(request: TranscriptionRequest):
    audio_path = resolve_uploaded_audio(request.audioPath)
    language = request.language if request.language in {"en", "zh"} else None
    try:
        with model_lock:
            segments, info = get_model().transcribe(
                str(audio_path),
                language=language,
                beam_size=5,
                vad_filter=True,
                word_timestamps=False,
                initial_prompt=request.prompt,
            )
            items = [
                {"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip()}
                for s in segments
                if s.text.strip()
            ]
    except Exception as error:
        raise HTTPException(500, f"Transcription failed: {error}") from error
    return {
        "text": " ".join(item["text"] for item in items).strip(),
        "language": info.language,
        "languageProbability": round(info.language_probability, 4),
        "duration": round(info.duration, 3),
        "segments": items,
        "model": MODEL_NAME,
    }
