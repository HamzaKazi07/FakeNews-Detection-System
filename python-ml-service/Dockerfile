FROM python:3.11-slim
WORKDIR /app
COPY python-ml-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && python -m nltk.downloader stopwords wordnet omw-1.4
COPY python-ml-service /app
COPY backend/model.pkl backend/vectorizer.pkl /artifacts/
ENV MODEL_PATH=/artifacts/model.pkl VECTORIZER_PATH=/artifacts/vectorizer.pkl
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
