import os
import pandas as pd
import numpy as np
import re
import pickle
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report

# Download necessary NLTK data safely if not already present
for resource in ['stopwords', 'wordnet', 'omw-1.4']:
    try:
        nltk.data.find(f'corpora/{resource}')
    except LookupError:
        nltk.download(resource, quiet=True)

def preprocess_text(text):
    if not isinstance(text, str):
        return ""
    # Lowercase
    text = text.lower()
    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    # Remove HTML tags
    text = re.sub(r'<.*?>', '', text)
    # Remove punctuation, numbers, and symbols
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    # Tokenize and remove stopwords, apply Lemmatization
    stop_words = set(stopwords.words('english'))
    lemmatizer = WordNetLemmatizer()
    
    words = text.split()
    cleaned_words = [lemmatizer.lemmatize(w) for w in words if w not in stop_words]
    
    return " ".join(cleaned_words)

def main():
    print("=== Step 2 & 3: Loading and Cleaning Data ===")
    fake_path = os.path.join("..", "dataset", "Fake.csv")
    true_path = os.path.join("..", "dataset", "True.csv")
    
    if not os.path.exists(fake_path) or not os.path.exists(true_path):
        # Fallback to local workspace if run from root
        fake_path = os.path.join("dataset", "Fake.csv")
        true_path = os.path.join("dataset", "True.csv")
        
    if not os.path.exists(fake_path) or not os.path.exists(true_path):
        print("Dataset files not found! Please check path.")
        return

    print("Reading CSV files...")
    fake = pd.read_csv(fake_path)
    real = pd.read_csv(true_path)
    
    print(f"Fake news count: {len(fake)}")
    print(f"Real news count: {len(real)}")
    
    fake["label"] = 0
    real["label"] = 1
    
    # Merge
    data = pd.concat([fake, real], ignore_index=True)
    
    # Clean duplicates and nulls
    print("Dropping duplicates and null values...")
    data.dropna(subset=['text', 'title'], inplace=True)
    data.drop_duplicates(subset=['text'], inplace=True)
    print(f"Cleaned dataset count: {len(data)}")
    
    # Combine title and text for better classification accuracy
    data['full_text'] = data['title'] + " " + data['text']
    
    print("\n=== Step 4: Text Preprocessing ===")
    print("Preprocessing text (lowercase, stopwords removal, lemmatization)...")
    # To speed up training in scripts, we can sample if needed, but we will use full or subset.
    # Let's take a sample of 15,000 for faster script demonstration, or run full if system is fast.
    sample_data = data.sample(n=min(15000, len(data)), random_state=42).copy()
    sample_data['cleaned_text'] = sample_data['full_text'].apply(preprocess_text)
    
    X = sample_data['cleaned_text']
    y = sample_data['label']
    
    print("\n=== Step 6 & 7: Feature Extraction & Dataset Split ===")
    # TF-IDF Vectorizer
    vectorizer = TfidfVectorizer(max_features=5000, max_df=0.85, min_df=2)
    X_tfidf = vectorizer.fit_transform(X)
    
    X_train, X_test, y_train, y_test = train_test_split(X_tfidf, y, test_size=0.2, random_state=42, stratify=y)
    print(f"Training set shape: {X_train.shape}")
    print(f"Testing set shape: {X_test.shape}")
    
    print("\n=== Step 8 & 9: Training and Evaluating Models ===")
    models = {
        "Logistic Regression": LogisticRegression(class_weight='balanced', max_iter=1000),
        "Naive Bayes": MultinomialNB(),
        "Decision Tree": DecisionTreeClassifier(max_depth=15, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
    }
    
    best_acc = 0
    best_model = None
    best_model_name = ""
    
    for name, model in models.items():
        print(f"\nTraining {name}...")
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        
        acc = accuracy_score(y_test, y_pred)
        p, r, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='binary')
        
        print(f"{name} Results:")
        print(f"  Accuracy:  {acc:.4f}")
        print(f"  Precision: {p:.4f}")
        print(f"  Recall:    {r:.4f}")
        print(f"  F1-Score:  {f1:.4f}")
        
        if acc > best_acc:
            best_acc = acc
            best_model = model
            best_model_name = name
            
    print(f"\nBest Model: {best_model_name} with Accuracy {best_acc:.4f}")
    
    print("\n=== Step 10: Saving Best Model ===")
    backend_dir = os.path.join("..", "backend")
    if not os.path.exists(backend_dir):
        backend_dir = "backend"
        
    model_save_path = os.path.join(backend_dir, "model.pkl")
    vectorizer_save_path = os.path.join(backend_dir, "vectorizer.pkl")
    
    with open(model_save_path, "wb") as f:
        pickle.dump(best_model, f)
    with open(vectorizer_save_path, "wb") as f:
        pickle.dump(vectorizer, f)
        
    print(f"Saved model to {model_save_path}")
    print(f"Saved vectorizer to {vectorizer_save_path}")
    print("Training finished successfully!")

if __name__ == "__main__":
    main()
