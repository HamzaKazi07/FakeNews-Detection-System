"""Shared training configuration for artifacts consumed by the ML service."""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from .preprocessing import preprocess_text

LABEL_TO_PREDICTION = {0: "FAKE", 1: "REAL"}
TFIDF_CONFIG = {
    "analyzer": "word",
    "binary": False,
    "decode_error": "strict",
    "dtype": np.float64,
    "encoding": "utf-8",
    "input": "content",
    "lowercase": True,
    "max_df": 0.7,
    "max_features": None,
    "min_df": 1,
    "ngram_range": (1, 1),
    "norm": "l2",
    "preprocessor": None,
    "smooth_idf": True,
    "stop_words": "english",
    "strip_accents": None,
    "sublinear_tf": False,
    "token_pattern": r"(?u)\b\w\w+\b",
    "tokenizer": None,
    "use_idf": True,
    "vocabulary": None,
}


def create_vectorizer() -> TfidfVectorizer:
    return TfidfVectorizer(**TFIDF_CONFIG)


def prepare_article_text(title: str, body: str) -> str:
    return preprocess_text(f"{title} {body}")