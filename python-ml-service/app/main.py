import hmac
import os
import pickle
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

from .preprocessing import PREPROCESSING_VERSION, preprocess_text
from .training import LABEL_TO_PREDICTION

BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_PATH = Path(os.getenv("MODEL_PATH", BASE_DIR / "backend" / "model.pkl"))
VECTORIZER_PATH = Path(os.getenv("VECTORIZER_PATH", BASE_DIR / "backend" / "vectorizer.pkl"))
MODEL_VERSION = os.getenv("MODEL_VERSION", "1.0.0")
SERVICE_TOKEN = os.getenv("ML_SERVICE_TOKEN", "")
MIN_NEWS_LENGTH = 20
MAX_NEWS_LENGTH = 50_000

app = FastAPI(title="Fake News ML Service", docs_url=None, redoc_url=None)
model = None
vectorizer = None
load_error = None


class PredictionRequest(BaseModel):
    text: str = Field(min_length=MIN_NEWS_LENGTH, max_length=MAX_NEWS_LENGTH)


class PredictionResponse(BaseModel):
    prediction: str
    confidence: float = Field(ge=0, le=1)
    important_words: list[str]
    model_version: str


def load_artifacts() -> None:
    global model, vectorizer, load_error
    try:
        with MODEL_PATH.open("rb") as handle:
            model = pickle.load(handle)
        with VECTORIZER_PATH.open("rb") as handle:
            vectorizer = pickle.load(handle)
        load_error = None
    except Exception as exc:  # Details remain server-side only.
        model, vectorizer, load_error = None, None, type(exc).__name__


@app.on_event("startup")
def startup() -> None:
    load_artifacts()


def require_service_token(x_ml_service_token: Annotated[str | None, Header()] = None) -> None:
    if not SERVICE_TOKEN or not x_ml_service_token or not hmac.compare_digest(x_ml_service_token, SERVICE_TOKEN):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized service request")


@app.get("/health")
def health():
    loaded = model is not None and vectorizer is not None
    return {"status": "UP" if loaded else "DOWN", "modelLoaded": model is not None,
            "vectorizerLoaded": vectorizer is not None, "modelVersion": MODEL_VERSION,
            "preprocessingVersion": PREPROCESSING_VERSION}


@app.post("/predict", response_model=PredictionResponse, dependencies=[__import__("fastapi").Depends(require_service_token)])
def predict(payload: PredictionRequest):
    if model is None or vectorizer is None:
        raise HTTPException(status_code=503, detail="Prediction service is temporarily unavailable.")
    cleaned = preprocess_text(payload.text)
    if not cleaned:
        raise HTTPException(status_code=422, detail="News text contains no analysable words.")
    vector = vectorizer.transform([cleaned])
    probabilities = model.predict_proba(vector)[0]
    labels = list(model.classes_)
    best_index = max(range(len(probabilities)), key=probabilities.__getitem__)
    prediction = LABEL_TO_PREDICTION[int(labels[best_index])]
    names = vectorizer.get_feature_names_out()
    scored = sorted(((names[index], float(vector[0, index])) for index in vector.nonzero()[1]), key=lambda item: item[1], reverse=True)
    return PredictionResponse(prediction=prediction, confidence=float(probabilities[best_index]),
                              important_words=[word for word, _ in scored[:8]], model_version=MODEL_VERSION)
