import numpy as np
from scipy.sparse import csr_matrix

from app import main
from app.preprocessing import preprocess_text
from app.main import LABEL_TO_PREDICTION
from app.training import TFIDF_CONFIG, create_vectorizer, prepare_article_text


def test_preprocessing_removes_url_html_and_stopwords():
    assert preprocess_text("The <b>CATS</b> are running at https://example.com") == "cat running"


def test_classifier_label_mapping_matches_training_contract():
    assert LABEL_TO_PREDICTION == {0: "FAKE", 1: "REAL"}


def test_saved_model_and_vectorizer_have_compatible_features():
    main.load_artifacts()

    assert main.model is not None
    assert main.vectorizer is not None
    assert main.model.classes_.tolist() == [0, 1]
    assert main.model.n_features_in_ == len(main.vectorizer.get_feature_names_out())


def test_training_vectorizer_configuration_matches_saved_vectorizer():
    main.load_artifacts()

    assert main.vectorizer is not None
    saved_params = main.vectorizer.get_params()
    for name, value in TFIDF_CONFIG.items():
        assert saved_params[name] == value
    assert len(main.vectorizer.get_feature_names_out()) == 121_689


def test_prediction_response_contains_valid_label_and_confidence(monkeypatch):
    class FakeModel:
        classes_ = np.array([0, 1])

        def predict_proba(self, _vector):
            return np.array([[0.2, 0.8]])

    class FakeVectorizer:
        def transform(self, _texts):
            return csr_matrix([[1.0, 0.5]])

        def get_feature_names_out(self):
            return np.array(["factual", "report"])

    monkeypatch.setattr(main, "model", FakeModel())
    monkeypatch.setattr(main, "vectorizer", FakeVectorizer())
    response = main.predict(main.PredictionRequest(text="A factual report about a public event."))

    assert response.prediction in {"FAKE", "REAL"}
    assert 0 <= response.confidence <= 1
    assert response.prediction == "REAL"


def test_title_and_body_are_preprocessed_as_one_input():
    title = "Public health report"
    body = "Officials published the findings on Tuesday."

    assert prepare_article_text(title, body) == preprocess_text(title + " " + body)


def test_training_vectorizer_uses_shared_preprocessing():
    vectorizer = create_vectorizer()
    article = prepare_article_text("Public health report", "Officials published the findings.")

    assert article == preprocess_text("Public health report Officials published the findings.")
    assert vectorizer.get_params() == TFIDF_CONFIG
