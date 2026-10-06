import base64
import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import main


TEST_SERVICE_TOKEN = "stage3-test-token"
VALID_TEXT = "Officials published a detailed report about a public event and its findings."
MODEL_ARTIFACTS_AVAILABLE = main.MODEL_PATH.is_file() and main.VECTORIZER_PATH.is_file()


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "SERVICE_TOKEN", TEST_SERVICE_TOKEN)
    with TestClient(main.app) as test_client:
        yield test_client


@pytest.mark.skipif(not MODEL_ARTIFACTS_AVAILABLE, reason="Existing model artifacts are not staged.")
def test_health_reports_loaded_ml_service(client):
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "UP"
    assert payload["modelLoaded"] is True
    assert payload["vectorizerLoaded"] is True
    assert payload["modelVersion"] == main.MODEL_VERSION
    assert payload["preprocessingVersion"] == main.PREPROCESSING_VERSION


@pytest.mark.skipif(not MODEL_ARTIFACTS_AVAILABLE, reason="Existing model artifacts are not staged.")
def test_predict_returns_actual_response_contract(client):
    response = client.post(
        "/predict",
        headers={"X-ML-Service-Token": TEST_SERVICE_TOKEN},
        json={"text": VALID_TEXT},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["prediction"] in {"FAKE", "REAL"}
    assert isinstance(payload["confidence"], float)
    assert 0 <= payload["confidence"] <= 1
    assert isinstance(payload["important_words"], list)
    assert payload["model_version"] == main.MODEL_VERSION


def test_predict_without_token_returns_unauthorized_error(client):
    response = client.post("/predict", json={"text": VALID_TEXT})

    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized service request"}


def test_predict_with_invalid_token_returns_unauthorized_error(client):
    response = client.post(
        "/predict",
        headers={"X-ML-Service-Token": "invalid-stage3-token"},
        json={"text": VALID_TEXT},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized service request"}


@pytest.mark.parametrize("text", ["", "too short"])
def test_predict_rejects_invalid_text_length(client, text):
    response = client.post(
        "/predict",
        headers={"X-ML-Service-Token": TEST_SERVICE_TOKEN},
        json={"text": text},
    )

    assert response.status_code == 422
    payload = response.json()
    assert isinstance(payload["detail"], list)
    assert payload["detail"][0]["loc"][-1] == "text"


def test_predict_rejects_text_over_actual_maximum_length(client):
    response = client.post(
        "/predict",
        headers={"X-ML-Service-Token": TEST_SERVICE_TOKEN},
        json={"text": "a" * (main.MAX_NEWS_LENGTH + 1)},
    )

    assert response.status_code == 422
    payload = response.json()
    assert isinstance(payload["detail"], list)
    assert payload["detail"][0]["loc"][-1] == "text"


def test_predict_returns_service_unavailable_when_model_is_missing(client, monkeypatch):
    monkeypatch.setattr(main, "model", None)

    response = client.post(
        "/predict",
        headers={"X-ML-Service-Token": TEST_SERVICE_TOKEN},
        json={"text": VALID_TEXT},
    )

    assert response.status_code == 503
    assert response.json() == {
        "detail": "Prediction service is temporarily unavailable."
    }


def test_predict_image_runs_ocr_and_prediction_for_a_valid_image(client, monkeypatch):
    image_buffer = io.BytesIO()
    Image.new("RGB", (20, 20), color="white").save(image_buffer, format="PNG")
    monkeypatch.setattr(main.pytesseract, "image_to_string", lambda _image: VALID_TEXT)
    monkeypatch.setattr(
        main,
        "do_predict",
        lambda _text: main.PredictionResponse(
            prediction="REAL",
            confidence=0.75,
            important_words=["report"],
            model_version=main.MODEL_VERSION,
        ),
    )
    encoded = base64.b64encode(image_buffer.getvalue()).decode("ascii")

    response = client.post(
        "/predict-image",
        headers={"X-ML-Service-Token": TEST_SERVICE_TOKEN},
        json={"image_base64": encoded},
    )

    assert response.status_code == 200
    assert response.json()["prediction"] == "REAL"
    assert response.json()["extracted_text"] == VALID_TEXT


def test_predict_image_rejects_images_over_pixel_limit_before_ocr(client, monkeypatch):
    class OversizedImage:
        format = "PNG"
        size = (5_001, 5_000)

        def load(self):
            pytest.fail("Oversized image must be rejected before decoding.")

    monkeypatch.setattr(main.Image, "open", lambda _source: OversizedImage())
    monkeypatch.setattr(
        main.pytesseract,
        "image_to_string",
        lambda _image: pytest.fail("OCR must not run for an oversized image."),
    )
    encoded = base64.b64encode(b"image-header").decode("ascii")

    response = client.post(
        "/predict-image",
        headers={"X-ML-Service-Token": TEST_SERVICE_TOKEN},
        json={"image_base64": encoded},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Image dimensions exceed the 25-megapixel limit."
    }


def test_predict_image_rejects_invalid_image_safely(client):
    response = client.post(
        "/predict-image",
        headers={"X-ML-Service-Token": TEST_SERVICE_TOKEN},
        json={"image_base64": base64.b64encode(b"not an image").decode("ascii")},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid or unreadable image."}
