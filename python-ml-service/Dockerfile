FROM python:3.11-slim
WORKDIR /app
COPY python-ml-service/requirements.txt .
RUN apt-get update && apt-get install -y tesseract-ocr libtesseract-dev && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements.txt \
    && python -m nltk.downloader -d /usr/local/share/nltk_data stopwords wordnet omw-1.4 \
    && chmod -R a+rX /usr/local/share/nltk_data \
    && groupadd --system --gid 10001 app \
    && useradd --system --uid 10001 --gid app --home-dir /home/app app
ENV NLTK_DATA=/usr/local/share/nltk_data
COPY python-ml-service/app /app/app
COPY python-ml-service/artifacts/ /artifacts/
RUN if [ ! -s /artifacts/model.pkl ] || [ ! -s /artifacts/vectorizer.pkl ]; then \
        echo >&2 "Missing ML artifacts. Copy the existing model.pkl and vectorizer.pkl into python-ml-service/artifacts/ before running docker compose build."; \
        exit 1; \
    fi \
    && chmod 0444 /artifacts/model.pkl /artifacts/vectorizer.pkl
ENV MODEL_PATH=/artifacts/model.pkl VECTORIZER_PATH=/artifacts/vectorizer.pkl
EXPOSE 8000
USER 10001:10001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
