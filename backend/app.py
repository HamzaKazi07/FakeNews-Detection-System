import os
import re
import datetime
import pickle

import jwt
import requests
import bcrypt

from flask import Flask, request, jsonify
from flask_cors import CORS
from bs4 import BeautifulSoup

import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

from database import (
    init_db,
    register_user,
    get_user_by_email,
    get_user_by_id,
    get_all_users,
    delete_user_by_id,
    add_history_entry,
    get_history_by_user,
    get_all_history,
    update_history_feedback,
    delete_history_entry,
    admin_delete_history_entry,
    get_dashboard_stats,
    get_user_dashboard_stats
)

# =========================================================
# IMAGE OCR
# =========================================================

try:
    from PIL import Image, ImageOps, ImageFilter
    import pytesseract

    # -----------------------------------------------------
    # TESSERACT OCR ENGINE
    # -----------------------------------------------------

    TESSERACT_PATHS = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"
    ]

    tesseract_found = False

    for tesseract_path in TESSERACT_PATHS:
        if os.path.exists(tesseract_path):
            pytesseract.pytesseract.tesseract_cmd = (
                tesseract_path
            )

            tesseract_found = True

            print(
                f"Tesseract OCR found: {tesseract_path}"
            )

            break

    if not tesseract_found:
        print(
            "WARNING: Tesseract OCR executable "
            "was not found."
        )

except ImportError:
    Image = None
    ImageOps = None
    ImageFilter = None
    pytesseract = None

    print(
        "WARNING: Pillow or pytesseract is not installed."
    )

# =========================================================
# NLTK
# =========================================================

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download(
        'stopwords',
        quiet=True
    )

try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download(
        'wordnet',
        quiet=True
    )

# =========================================================
# APP
# =========================================================

app = Flask(__name__)

CORS(app)

SECRET_KEY = "super-secret-key-for-fake-news-detector"

# =========================================================
# MODEL
# =========================================================

MODEL_PATH = os.path.join(
    os.path.dirname(__file__),
    "model.pkl"
)

VECTORIZER_PATH = os.path.join(
    os.path.dirname(__file__),
    "vectorizer.pkl"
)

init_db()

model = None
vectorizer = None

try:
    with open(
        MODEL_PATH,
        "rb"
    ) as f:
        model = pickle.load(f)

    with open(
        VECTORIZER_PATH,
        "rb"
    ) as f:
        vectorizer = pickle.load(f)

    print(
        "Model and Vectorizer loaded successfully!"
    )

except Exception as e:
    print(
        f"Error loading models: {e}. "
        "Predictions will run in simulation mode."
    )

# =========================================================
# TEXT PREPROCESSING
# =========================================================

def preprocess_text(text):
    if not isinstance(text, str):
        return ""

    text = text.lower()

    text = re.sub(
        r'https?://\S+|www\.\S+',
        '',
        text
    )

    text = re.sub(
        r'<.*?>',
        '',
        text
    )

    text = re.sub(
        r'[^a-zA-Z\s]',
        '',
        text
    )

    stop_words = set(
        stopwords.words('english')
    )

    lemmatizer = WordNetLemmatizer()

    words = text.split()

    cleaned = [
        lemmatizer.lemmatize(word)
        for word in words
        if word not in stop_words
    ]

    return " ".join(cleaned)

# =========================================================
# JWT
# =========================================================

def generate_token(user):
    payload = {
        "user_id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": (
            datetime.datetime.utcnow()
            + datetime.timedelta(days=7)
        )
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm="HS256"
    )

def token_required(f):
    def decorator(*args, **kwargs):
        token = None

        auth_header = request.headers.get(
            "Authorization"
        )

        if auth_header and auth_header.startswith(
            "Bearer "
        ):
            token = auth_header.split(
                " ",
                1
            )[1]

        if not token:
            return jsonify({
                "error":
                    "Authorization token is missing"
            }), 401

        try:
            data = jwt.decode(
                token,
                SECRET_KEY,
                algorithms=["HS256"]
            )

            current_user = get_user_by_id(
                data["user_id"]
            )

            if not current_user:
                return jsonify({
                    "error":
                        "User not found"
                }), 401

        except jwt.ExpiredSignatureError:
            return jsonify({
                "error":
                    "Token has expired"
            }), 401

        except jwt.InvalidTokenError:
            return jsonify({
                "error":
                    "Invalid token"
            }), 401

        return f(
            current_user,
            *args,
            **kwargs
        )

    decorator.__name__ = f.__name__

    return decorator

# =========================================================
# PREDICTION
# =========================================================

def predict_news_credibility(text):
    """
    Predict whether supplied news text is REAL or FAKE
    using the trained ML model and vectorizer.

    Returns:
        prediction
        confidence
        important_words
    """

    if not isinstance(text, str):
        return "FAKE", 0.5, []

    text = text.strip()

    if not text:
        return "FAKE", 0.5, []

    # -----------------------------------------------------
    # PREPROCESS TEXT
    # -----------------------------------------------------

    cleaned = preprocess_text(text)

    if not cleaned:
        return "FAKE", 0.5, []

    # -----------------------------------------------------
    # MODEL CHECK
    # -----------------------------------------------------

    if model is None or vectorizer is None:
        raise RuntimeError(
            "ML model or vectorizer is not loaded."
        )

    try:

        # -------------------------------------------------
        # TRANSFORM TEXT
        # -------------------------------------------------

        vec = vectorizer.transform(
            [cleaned]
        )

        # -------------------------------------------------
        # MODEL PREDICTION
        # -------------------------------------------------

        prediction_value = model.predict(vec)[0]

        # -------------------------------------------------
        # CONFIDENCE
        # -------------------------------------------------

        if hasattr(model, "predict_proba"):

            probabilities = model.predict_proba(vec)[0]

            classes = list(
                model.classes_
            )

            probability_map = {
                str(label): float(probability)
                for label, probability
                in zip(classes, probabilities)
            }

            # Expected project mapping:
            # 0 = FAKE
            # 1 = REAL
            fake_probability = probability_map.get(
                "0",
                probability_map.get(
                    "FAKE",
                    probability_map.get(
                        "fake",
                        0.0
                    )
                )
            )

            real_probability = probability_map.get(
                "1",
                probability_map.get(
                    "REAL",
                    probability_map.get(
                        "real",
                        0.0
                    )
                )
            )

            # If the model uses numeric numpy labels,
            # explicitly check them.
            if fake_probability == 0.0 and real_probability == 0.0:
                try:
                    for label, probability in zip(
                        classes,
                        probabilities
                    ):
                        if int(label) == 0:
                            fake_probability = float(
                                probability
                            )
                        elif int(label) == 1:
                            real_probability = float(
                                probability
                            )
                except (ValueError, TypeError):
                    pass

            if real_probability >= fake_probability:
                prediction = "REAL"
                confidence = real_probability
            else:
                prediction = "FAKE"
                confidence = fake_probability

        else:

            prediction_string = str(
                prediction_value
            ).upper()

            if prediction_string in [
                "1",
                "REAL",
                "TRUE"
            ]:
                prediction = "REAL"
            else:
                prediction = "FAKE"

            confidence = 1.0

        # -------------------------------------------------
        # IMPORTANT WORDS
        # -------------------------------------------------

        important_words = []

        try:

            feature_names = (
                vectorizer
                .get_feature_names_out()
            )

            feature_indices = (
                vec.nonzero()[1]
            )

            tfidf_scores = []

            for index in feature_indices:

                score = float(
                    vec[0, index]
                )

                tfidf_scores.append(
                    (
                        feature_names[index],
                        score
                    )
                )

            tfidf_scores.sort(
                key=lambda item: item[1],
                reverse=True
            )

            important_words = [
                word
                for word, score
                in tfidf_scores[:8]
            ]

        except Exception as feature_error:

            print(
                "Important-word extraction failed:",
                feature_error
            )

        return (
            prediction,
            max(
                0.0,
                min(
                    1.0,
                    float(confidence)
                )
            ),
            important_words
        )

    except Exception as prediction_error:

        print(
            "ML prediction failed:",
            prediction_error
        )

        raise RuntimeError(
            "The trained ML model could not "
            "process this news article."
        )

# =========================================================
# ROOT
# =========================================================

@app.route("/")
def index():
    return jsonify({
        "status": "online",
        "message":
            "Fake News Detector API is running",
        "model_loaded":
            model is not None
    })

# =========================================================
# AUTH: REGISTER
# IMPORTANT:
# Registration creates the account only.
# It DOES NOT generate a login token.
# =========================================================

@app.route(
    "/api/auth/register",
    methods=["POST"]
)
def auth_register():
    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    name = str(
        data.get("name", "")
    ).strip()

    email = str(
        data.get("email", "")
    ).strip().lower()

    password = str(
        data.get("password", "")
    )

    if not name:
        return jsonify({
            "error":
                "Full name is required."
        }), 400

    if len(name) < 2:
        return jsonify({
            "error":
                "Full name must contain at least 2 characters."
        }), 400

    if len(name) > 100:
        return jsonify({
            "error":
                "Full name must not exceed 100 characters."
        }), 400

    if not email:
        return jsonify({
            "error":
                "Email address is required."
        }), 400

    email_pattern = (
        r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    )

    if not re.match(
        email_pattern,
        email
    ):
        return jsonify({
            "error":
                "Please enter a valid email address."
        }), 400

    if not password:
        return jsonify({
            "error":
                "Password is required."
        }), 400

    if len(password) < 8:
        return jsonify({
            "error":
                "Password must contain at least 8 characters."
        }), 400

    if len(password) > 128:
        return jsonify({
            "error":
                "Password must not exceed 128 characters."
        }), 400

    existing_user = get_user_by_email(
        email
    )

    if existing_user:
        return jsonify({
            "error":
                "Email is already registered. Please login instead."
        }), 409

    user = register_user(
        name,
        email,
        password
    )

    if not user:
        return jsonify({
            "error":
                "Unable to create account. Please try again."
        }), 500

    return jsonify({
        "message":
            "Registration successful. Please login to continue.",
        "user":
            user
    }), 201

# =========================================================
# AUTH: LOGIN
# =========================================================

@app.route(
    "/api/auth/login",
    methods=["POST"]
)
def auth_login():
    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    email = str(
        data.get("email", "")
    ).strip().lower()

    password = str(
        data.get("password", "")
    )

    if not email or not password:
        return jsonify({
            "error":
                "Please provide email and password"
        }), 400

    user = get_user_by_email(
        email
    )

    if not user:
        return jsonify({
            "error":
                "Invalid email or password"
        }), 401

    if not bcrypt.checkpw(
        password.encode("utf-8"),
        user["password"].encode("utf-8")
    ):
        return jsonify({
            "error":
                "Invalid email or password"
        }), 401

    token = generate_token(
        user
    )

    return jsonify({
        "message":
            "Login successful",
        "token":
            token,
        "user": {
            "id":
                user["id"],
            "name":
                user["name"],
            "email":
                user["email"],
            "role":
                user["role"]
        }
    })

# =========================================================
# AUTH: CURRENT USER
# =========================================================

@app.route(
    "/api/auth/me",
    methods=["GET"]
)
@token_required
def auth_me(current_user):
    return jsonify({
        "user":
            current_user
    })

# =========================================================
# PREDICTION: TEXT
# PROTECTED
# =========================================================

@app.route(
    "/api/predict",
    methods=["POST"]
)
@token_required
def api_predict(current_user):

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    text = str(
        data.get(
            "text",
            ""
        )
    ).strip()

    # -----------------------------------------------------
    # VALIDATION
    # -----------------------------------------------------

    if not text:
        return jsonify({
            "error":
                "News content cannot be empty."
        }), 400

    if len(text) < 20:
        return jsonify({
            "error":
                "Please provide at least 20 characters of news content."
        }), 400

    if len(text) > 50000:
        return jsonify({
            "error":
                "News content is too long. Maximum 50,000 characters allowed."
        }), 400

    try:

        # -------------------------------------------------
        # ML PREDICTION
        # -------------------------------------------------

        prediction, confidence, important_words = (
            predict_news_credibility(text)
        )

        # -------------------------------------------------
        # SAVE USER HISTORY
        # -------------------------------------------------

        entry_id = add_history_entry(
            current_user["id"],
            text,
            prediction,
            confidence
        )

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return jsonify({
            "id": entry_id,

            "prediction":
                prediction,

            "confidence":
                round(
                    confidence * 100,
                    1
                ),

            "important_words":
                important_words,

            "text_preview":
                (
                    text[:150] + "..."
                    if len(text) > 150
                    else text
                )
        }), 200

    except RuntimeError as error:

        print(
            "Prediction service error:",
            error
        )

        return jsonify({
            "error":
                "The AI prediction model is currently unavailable. "
                "Please make sure the trained model and vectorizer are loaded."
        }), 503

    except Exception as error:

        print(
            "Unexpected prediction error:",
            error
        )

        return jsonify({
            "error":
                "Unable to analyze this news article right now."
        }), 500

# =========================================================
# PREDICTION: URL
# PROTECTED
# =========================================================

@app.route(
    "/api/predict-url",
    methods=["POST"]
)
@token_required
def api_predict_url(current_user):
    data = (
        request.get_json()
        or {}
    )

    url = data.get(
        "url",
        ""
    )

    if not url or not url.strip():
        return jsonify({
            "error":
                "URL cannot be empty"
        }), 400

    try:
        headers = {
            "User-Agent":
                "Mozilla/5.0 "
                "(Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 "
                "(KHTML, like Gecko) "
                "Chrome/91.0.4472.124 "
                "Safari/537.36"
        }

        res = requests.get(
            url,
            headers=headers,
            timeout=8
        )

        if res.status_code != 200:
            return jsonify({
                "error":
                    f"Failed to fetch webpage. "
                    f"HTTP status: {res.status_code}"
            }), 400

        soup = BeautifulSoup(
            res.text,
            "html.parser"
        )

        title = soup.find("h1")

        title_text = (
            title.get_text()
            if title
            else ""
        )

        paragraphs = soup.find_all(
            "p"
        )

        body_text = " ".join(
            [
                p.get_text()
                for p in paragraphs
                if len(p.get_text()) > 20
            ]
        )

        full_text = (
            f"{title_text} {body_text}"
        ).strip()

        if len(full_text) < 50:
            return jsonify({
                "error":
                    "Insufficient text scraped from URL. "
                    "Please paste content manually."
            }), 400

        prediction, confidence, important_words = (
            predict_news_credibility(
                full_text
            )
        )

        entry_id = add_history_entry(
            current_user["id"],
            full_text,
            prediction,
            confidence
        )

        return jsonify({
            "id":
                entry_id,
            "title":
                (
                    title_text[:100] + "..."
                    if len(title_text) > 100
                    else title_text
                ),
            "prediction":
                prediction,
            "confidence":
                round(
                    confidence * 100,
                    1
                ),
            "important_words":
                important_words,
            "scraped_text":
                (
                    full_text[:400] + "..."
                    if len(full_text) > 400
                    else full_text
                )
        })

    except Exception as e:
        return jsonify({
            "error":
                f"Failed to parse news URL: {str(e)}"
        }), 500

# =========================================================
# PREDICTION: IMAGE / OCR
# PROTECTED
# =========================================================

@app.route(
    "/api/predict-image",
    methods=["POST"]
)
@token_required
def api_predict_image(current_user):

    # -----------------------------------------------------
    # CHECK IMAGE
    # -----------------------------------------------------

    if "image" not in request.files:
        return jsonify({
            "error":
                "No image file uploaded."
        }), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({
            "error":
                "No selected image file."
        }), 400

    # -----------------------------------------------------
    # CHECK OCR DEPENDENCIES
    # -----------------------------------------------------

    if Image is None or pytesseract is None:
        return jsonify({
            "error":
                "OCR service is not available. "
                "Please install Pillow, pytesseract, "
                "and the Tesseract OCR engine."
        }), 500

    try:

        # -------------------------------------------------
        # OPEN IMAGE
        # -------------------------------------------------

        image = Image.open(
            file.stream
        )

        # -------------------------------------------------
        # VERIFY IMAGE
        # -------------------------------------------------

        image.verify()

        # The stream needs to be reopened after verify()
        file.stream.seek(0)

        image = Image.open(
            file.stream
        )

        # -------------------------------------------------
        # CONVERT IMAGE
        # -------------------------------------------------

        image = image.convert(
            "RGB"
        )

        # -------------------------------------------------
        # IMAGE PREPROCESSING
        # Improves OCR accuracy
        # -------------------------------------------------

        # Convert to grayscale
        gray_image = ImageOps.grayscale(
            image
        )

        # Increase image size for small text
        width, height = gray_image.size

        if width < 1600:
            scale = 1600 / width

            new_width = 1600
            new_height = int(
                height * scale
            )

            gray_image = gray_image.resize(
                (
                    new_width,
                    new_height
                )
            )

        # Improve contrast
        gray_image = ImageOps.autocontrast(
            gray_image
        )

        # Slightly sharpen the image
        gray_image = gray_image.filter(
            ImageFilter.SHARPEN
        )

        # -------------------------------------------------
        # REAL TESSERACT OCR
        # -------------------------------------------------

        extracted_text = pytesseract.image_to_string(
            gray_image,
            config="--oem 3 --psm 6"
        )

        extracted_text = (
            extracted_text
            .strip()
        )

        # -------------------------------------------------
        # NO FAKE FALLBACK
        # -------------------------------------------------

        if not extracted_text:
            return jsonify({
                "error":
                    "No readable text was detected "
                    "in the uploaded image. "
                    "Please upload a clearer image "
                    "containing article text."
            }), 400

        # -------------------------------------------------
        # CLEAN OCR TEXT
        # -------------------------------------------------

        extracted_text = re.sub(
            r"\s+",
            " ",
            extracted_text
        ).strip()

        # -------------------------------------------------
        # PREDICT USING ACTUAL OCR TEXT
        # -------------------------------------------------

        prediction, confidence, important_words = (
            predict_news_credibility(
                extracted_text
            )
        )

        # -------------------------------------------------
        # SAVE HISTORY
        # -------------------------------------------------

        entry_id = add_history_entry(
            current_user["id"],
            extracted_text,
            prediction,
            confidence
        )

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return jsonify({
            "id":
                entry_id,

            "extracted_text":
                (
                    extracted_text[:500] + "..."
                    if len(extracted_text) > 500
                    else extracted_text
                ),

            "prediction":
                prediction,

            "confidence":
                round(
                    confidence * 100,
                    1
                ),

            "important_words":
                important_words,

            "ocr_method":
                "Tesseract OCR Engine"
        })

    except Exception as e:

        print(
            f"OCR processing error: {e}"
        )

        return jsonify({
            "error":
                    "Unable to read text from "
                    "the uploaded image. "
                    "Please upload a clearer image."
        }), 400

# =========================================================
# LIVE NEWS
# This is only a public news feed.
# It does NOT create user analytics records.
# =========================================================

@app.route(
    "/api/live-news",
    methods=["GET"]
)
def api_live_news():
    try:
        res = requests.get(
            "https://feeds.bbci.co.uk/news/rss.xml",
            timeout=5
        )

        xml_content = (
            res.content
            .replace(
                b"<link>",
                b"<link_url>"
            )
            .replace(
                b"</link>",
                b"</link_url>"
            )
        )

        soup = BeautifulSoup(
            xml_content,
            "html.parser"
        )

        items = soup.find_all(
            "item"
        )

        articles = []

        for item in items[:8]:
            title_tag = item.find(
                "title"
            )

            desc_tag = item.find(
                "description"
            )

            link_tag = item.find(
                "link_url"
            )

            title = (
                title_tag.get_text()
                if title_tag
                else ""
            )

            desc = (
                desc_tag.get_text()
                if desc_tag
                else ""
            )

            link = (
                link_tag.get_text()
                if link_tag
                else ""
            )

            full_content = (
                f"{title}. {desc}"
            )

            pred, conf, _ = (
                predict_news_credibility(
                    full_content
                )
            )

            articles.append({
                "title":
                    title,
                "description":
                    desc,
                "link":
                    link,
                "prediction":
                    pred,
                "confidence":
                    round(
                        conf * 100,
                        1
                    )
            })

        if articles:
            return jsonify({
                "news":
                    articles,
                "source":
                    "BBC News RSS Feed"
            })

    except Exception as e:
        print(
            f"Error fetching live RSS: {e}"
        )

    mock_news = [
        {
            "title":
                "NASA discovers new Earth-like planet "
                "orbiting nearby star system",
            "description":
                "Astronomers confirm the planet sits "
                "in the habitable zone and has potential "
                "atmospheric signs of water.",
            "link":
                "https://example.com/nasa-planet",
            "prediction":
                "REAL",
            "confidence":
                92.5
        },
        {
            "title":
                "SECRET DISCLOSED: Eating raw banana "
                "peels reverses aging in 2 days",
            "description":
                "Shocking miracle discovery by anonymous "
                "researcher shows bananas contain hidden "
                "enzymes that erase wrinkles.",
            "link":
                "https://example.com/banana-secret",
            "prediction":
                "FAKE",
            "confidence":
                98.2
        },
        {
            "title":
                "Central Bank announces interest rate "
                "cut to boost economic growth",
            "description":
                "The monetary policy committee voted "
                "to lower interest rates by 25 basis "
                "points starting next month.",
            "link":
                "https://example.com/bank-cut",
            "prediction":
                "REAL",
            "confidence":
                96.0
        },
        {
            "title":
                "Alien spacecraft landing confirmed "
                "in area 51 by military officer",
            "description":
                "Exclusive photos expose secret operations "
                "and shocking technologies retrieved from "
                "extraterrestrial vehicles.",
            "link":
                "https://example.com/alien-landing",
            "prediction":
                "FAKE",
            "confidence":
                99.4
        }
    ]

    return jsonify({
        "news":
            mock_news,
        "source":
            "Curated Top Headlines Stream"
    })

# =========================================================
# USER HISTORY
# =========================================================

@app.route(
    "/api/history",
    methods=["GET"]
)
@token_required
def api_get_history(current_user):
    history_entries = (
        get_history_by_user(
            current_user["id"]
        )
    )

    return jsonify({
        "history":
            history_entries
    })

# =========================================================
# FEEDBACK
# PROTECTED
# =========================================================

@app.route(
    "/api/feedback",
    methods=["POST"]
)
@token_required
def api_post_feedback(current_user):
    data = (
        request.get_json()
        or {}
    )

    entry_id = data.get(
        "entry_id"
    )

    feedback = data.get(
        "feedback"
    )

    if (
        not entry_id
        or feedback not in [
            "yes",
            "no"
        ]
    ):
        return jsonify({
            "error":
                "Invalid payload parameters"
        }), 400

    success = update_history_feedback(
        entry_id,
        feedback,
        current_user["id"]
    )

    if success:
        return jsonify({
            "message":
                "Feedback submitted successfully"
        })

    return jsonify({
        "error":
            "History entry not found or unauthorized"
    }), 404

# =========================================================
# USER DASHBOARD
# IMPORTANT:
# This is NOT /api/admin/stats.
# It returns ONLY the current user's analytics.
# =========================================================

@app.route(
    "/api/dashboard/stats",
    methods=["GET"]
)
@token_required
def api_user_dashboard_stats(current_user):
    stats = get_user_dashboard_stats(
        current_user["id"]
    )

    return jsonify(
        stats
    )

# =========================================================
# ADMIN DASHBOARD
# =========================================================

@app.route(
    "/api/admin/stats",
    methods=["GET"]
)
@token_required
def api_admin_stats(current_user):
    if current_user["role"] != "admin":
        return jsonify({
            "error":
                "Access denied. Admin role required"
        }), 403

    stats = get_dashboard_stats()

    return jsonify(
        stats
    )

# =========================================================
# ADMIN USERS
# =========================================================

@app.route(
    "/api/admin/users",
    methods=["GET"]
)
@token_required
def api_admin_users(current_user):
    if current_user["role"] != "admin":
        return jsonify({
            "error":
                "Access denied. Admin role required"
        }), 403

    users = get_all_users()

    return jsonify({
        "users":
            users
    })

@app.route(
    "/api/admin/users/<int:user_id>",
    methods=["DELETE"]
)
@token_required
def api_admin_delete_user(
    current_user,
    user_id
):
    if current_user["role"] != "admin":
        return jsonify({
            "error":
                "Access denied. Admin role required"
        }), 403

    success = delete_user_by_id(
        user_id
    )

    if success:
        return jsonify({
            "message":
                f"User ID {user_id} deleted successfully"
        })

    return jsonify({
        "error":
            "User not found or cannot delete"
    }), 404

# =========================================================
# ADMIN LOGS
# =========================================================

@app.route(
    "/api/admin/logs",
    methods=["GET"]
)
@token_required
def api_admin_logs(current_user):
    if current_user["role"] != "admin":
        return jsonify({
            "error":
                "Access denied. Admin role required"
        }), 403

    logs = get_all_history()

    return jsonify({
        "logs":
            logs
    })

@app.route(
    "/api/admin/logs/<int:log_id>",
    methods=["DELETE"]
)
@token_required
def api_admin_delete_log(
    current_user,
    log_id
):
    if current_user["role"] != "admin":
        return jsonify({
            "error":
                "Access denied. Admin role required"
        }), 403

    success = admin_delete_history_entry(
        log_id
    )

    if success:
        return jsonify({
            "message":
                f"Log ID {log_id} deleted successfully"
        })

    return jsonify({
        "error":
            "Log entry not found"
    }), 404

# =========================================================
# START SERVER
# =========================================================

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )