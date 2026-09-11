# Fake News Detection System

An AI and Natural Language Processing (NLP) system designed to verify news article credibility in real-time. It compares pasted text, scraped news URLs, scanned article screenshots (OCR), and voice speech inputs to predict if news content is **Credible (Real)** or **Sensational (Fake)**.

---

## 📁 Project Folder Structure

```
fake_news/
│
├── frontend/             # React (Vite) application
│   ├── src/
│   │   ├── components/   # UI Page Tabs (Navbar, Home, CheckNews, Dashboard, Admin, etc.)
│   │   ├── App.jsx       # Coordinates application tabs, themes, and global states
│   │   ├── App.css       # Premium custom styling design system
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
│
├── backend/              # Python Flask API Application
│   ├── app.py            # API controller routing prediction, OCR, Web scraping, and authentication
│   ├── database.py       # CRUD operations mapping SQLite users & history logs
│   ├── model.pkl         # Trained classification estimator
│   ├── vectorizer.pkl    # TF-IDF vocabulary weights mapping
│   └── requirements.txt
│
├── dataset/              # Cleaned/Raw CSV inputs
│   ├── Fake.csv
│   ├── True.csv
│   └── fake_news.csv
│
├── notebook/             # Model experimentation
│   ├── training.ipynb    # Jupyter NLP pre-processing & models evaluations comparison
│   └── train_model.py    # Console command helper script to retrain the models
│
├── database/             # SQLite binary folder (`fakenews.db`)
│
├── screenshots/          # System demonstration outputs
│
├── report/
│
└── README.md
```

---

## 🚀 Setting Up the Application

### 1. Prerequisites
Ensure you have the following installed:
- [Python 3.8+](https://www.python.org/)
- [Node.js v16+](https://nodejs.org/)

### 2. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the Flask application server:
   ```bash
   python app.py
   ```
   *The server runs locally on: http://localhost:5000*

### 3. Frontend Setup
1. Open a separate terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Boot up the Vite dev server:
   ```bash
   npm run dev
   ```
   *The web interface loads locally on: http://localhost:5173 (or another port output by Vite)*

---

## 🔑 Administrative Access

Pre-populated administrator account:
- **Email:** `admin@fakenews.com`
- **Password:** `adminpassword`

Admins can log in through the **Login** tab to access the **Admin Panel** where they can:
- Delete user accounts
- View global predictions logs
- Audit feedback ratings (precision accuracy timeline)

---

## 🧪 Test Cases

To verify model accuracy, test the following statements in the **Check News** panel:

### Case 1: Real News
- **Input:** *"NASA's James Webb Space Telescope has captured a stunning, high-resolution infrared image of a nearby star-forming region, revealing unprecedented details of cosmic dust and infant stars."*
- **Expected Output:** `REAL NEWS` (High confidence rating)

### Case 2: Fake News
- **Input:** *"BREAKING: Anonymous scientists expose shocking military conspiracy hiding banana peel enzymes that reverse human aging instantly! Authorities attempt to keep the miracle cure secret."*
- **Expected Output:** `FAKE NEWS` (Flags sensational keywords like "BREAKING", "EXCLUSIVE", "SHOCKING", "MIRACLE", "CONSPIRACY")
