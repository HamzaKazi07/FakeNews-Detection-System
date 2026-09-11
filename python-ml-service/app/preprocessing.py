"""Shared preprocessing used by the ML API and training code."""
import re
from functools import lru_cache

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

PREPROCESSING_VERSION = "1.0.0"


@lru_cache(maxsize=1)
def _resources():
    # Resources are provisioned during image/build setup; never download at request time.
    try:
        return set(stopwords.words("english")), WordNetLemmatizer()
    except LookupError as exc:
        raise RuntimeError("Required NLTK data is unavailable") from exc


def preprocess_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    stop_words, lemmatizer = _resources()
    normalized = re.sub(r"https?://\S+|www\.\S+", "", text.lower())
    normalized = re.sub(r"<.*?>", "", normalized)
    normalized = re.sub(r"[^a-zA-Z\s]", "", normalized)
    return " ".join(lemmatizer.lemmatize(word) for word in normalized.split() if word not in stop_words)
