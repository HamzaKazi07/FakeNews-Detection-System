import os
import sqlite3
import bcrypt

# =========================================================
# DATABASE CONFIGURATION
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DATABASE_DIR = os.path.abspath(
    os.path.join(
        BASE_DIR,
        "..",
        "database"
    )
)

DATABASE_PATH = os.path.join(
    DATABASE_DIR,
    "fakenews.db"
)

# =========================================================
# DATABASE CONNECTION
# =========================================================

def get_db_connection():
    os.makedirs(
        DATABASE_DIR,
        exist_ok=True
    )

    conn = sqlite3.connect(
        DATABASE_PATH,
        timeout=10
    )

    conn.row_factory = sqlite3.Row

    conn.execute(
        "PRAGMA foreign_keys = ON"
    )

    return conn

# =========================================================
# DATABASE INITIALIZATION
# =========================================================

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            news TEXT NOT NULL,
            prediction TEXT NOT NULL,
            confidence REAL NOT NULL,
            feedback TEXT DEFAULT NULL,
            date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    """)

    # =====================================================
    # MIGRATION FOR EXISTING DATABASES
    # =====================================================
    # The project may already contain an older fakenews.db.
    # CREATE TABLE IF NOT EXISTS does NOT modify an existing
    # table, so we must explicitly add columns introduced by
    # the authenticated-user version of the application.

    cursor.execute("PRAGMA table_info(users)")

    user_columns = [
        row["name"]
        for row in cursor.fetchall()
    ]

    if "created_at" not in user_columns:
        try:
            cursor.execute("""
                ALTER TABLE users
                ADD COLUMN created_at
                TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP
            """)
            print(
                "Database migration: added users.created_at"
            )
        except sqlite3.OperationalError as error:
            print(
                "Database migration warning:",
                error
            )

    # -----------------------------------------------------
    # HISTORY TABLE MIGRATION
    # -----------------------------------------------------
    # Older versions of the project stored prediction
    # history without user ownership. The current system
    # requires:
    #
    #   user_id  -> connects a prediction to the logged-in user
    #   feedback -> stores Yes/No prediction feedback
    #
    # Existing old history rows are intentionally left with
    # user_id = NULL. They will not appear in any normal
    # user's personal dashboard/history.

    cursor.execute("PRAGMA table_info(history)")

    history_columns = [
        row["name"]
        for row in cursor.fetchall()
    ]

    if "user_id" not in history_columns:
        try:
            cursor.execute("""
                ALTER TABLE history
                ADD COLUMN user_id INTEGER
            """)
            print(
                "Database migration: added history.user_id"
            )
        except sqlite3.OperationalError as error:
            print(
                "Database migration warning:",
                error
            )

    if "feedback" not in history_columns:
        try:
            cursor.execute("""
                ALTER TABLE history
                ADD COLUMN feedback TEXT DEFAULT NULL
            """)
            print(
                "Database migration: added history.feedback"
            )
        except sqlite3.OperationalError as error:
            print(
                "Database migration warning:",
                error
            )

    if "date" not in history_columns:
        try:
            cursor.execute("""
                ALTER TABLE history
                ADD COLUMN date
                TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP
            """)
            print(
                "Database migration: added history.date"
            )
        except sqlite3.OperationalError as error:
            print(
                "Database migration warning:",
                error
            )

    # Development admin account.
    cursor.execute("""
        SELECT id
        FROM users
        WHERE email = ?
    """, ("admin@fakenews.com",))

    admin = cursor.fetchone()

    if not admin:
        admin_password = "adminpassword"

        hashed_password = bcrypt.hashpw(
            admin_password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        cursor.execute("""
            INSERT INTO users
            (
                name,
                email,
                password,
                role
            )
            VALUES (?, ?, ?, ?)
        """, (
            "Admin User",
            "admin@fakenews.com",
            hashed_password,
            "admin"
        ))

        print(
            "Development admin account created."
        )

    conn.commit()
    conn.close()

# =========================================================
# PASSWORD HASHING
# =========================================================

def hash_password(password):
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

def verify_password(
    password,
    hashed_password
):
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

# =========================================================
# REGISTER USER
# =========================================================

def register_user(
    name,
    email,
    password
):
    name = str(name).strip()
    email = str(email).strip().lower()

    if not name or not email or not password:
        return None

    hashed_password = hash_password(password)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Public registration ALWAYS creates a normal user.
        cursor.execute("""
            INSERT INTO users
            (
                name,
                email,
                password,
                role
            )
            VALUES (?, ?, ?, 'user')
        """, (
            name,
            email,
            hashed_password
        ))

        conn.commit()

        user_id = cursor.lastrowid

        return {
            "id": user_id,
            "name": name,
            "email": email,
            "role": "user"
        }

    except sqlite3.IntegrityError as error:
        print(
            "Registration database error:",
            error
        )
        return None

    finally:
        conn.close()

# =========================================================
# GET USER BY EMAIL
# =========================================================

def get_user_by_email(email):
    email = str(
        email
    ).strip().lower()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM users
        WHERE email = ?
    """, (email,))

    user = cursor.fetchone()

    conn.close()

    if user:
        return dict(user)

    return None

# =========================================================
# GET USER BY ID
# =========================================================

def get_user_by_id(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            name,
            email,
            role,
            created_at
        FROM users
        WHERE id = ?
    """, (user_id,))

    user = cursor.fetchone()

    conn.close()

    if user:
        return dict(user)

    return None

# =========================================================
# ADMIN: GET ALL USERS
# =========================================================

def get_all_users():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            name,
            email,
            role,
            created_at
        FROM users
        WHERE role != 'admin'
        ORDER BY created_at DESC
    """)

    users = [
        dict(row)
        for row in cursor.fetchall()
    ]

    conn.close()

    return users

# =========================================================
# ADMIN: DELETE USER
# =========================================================

def delete_user_by_id(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM users
        WHERE id = ?
        AND role = 'user'
    """, (user_id,))

    conn.commit()

    deleted = cursor.rowcount > 0

    conn.close()

    return deleted

# =========================================================
# ADD HISTORY ENTRY
# =========================================================

def add_history_entry(
    user_id,
    news,
    prediction,
    confidence
):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO history
        (
            user_id,
            news,
            prediction,
            confidence
        )
        VALUES (?, ?, ?, ?)
    """, (
        user_id,
        news,
        prediction,
        confidence
    ))

    conn.commit()

    entry_id = cursor.lastrowid

    conn.close()

    return entry_id

# =========================================================
# GET USER'S OWN HISTORY
# =========================================================

def get_history_by_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            user_id,
            news,
            prediction,
            confidence,
            feedback,
            date
        FROM history
        WHERE user_id = ?
        ORDER BY date DESC
    """, (user_id,))

    history = [
        dict(row)
        for row in cursor.fetchall()
    ]

    conn.close()

    return history

# =========================================================
# GET ALL HISTORY
# ADMIN ONLY
# =========================================================

def get_all_history():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            h.id,
            h.user_id,
            h.news,
            h.prediction,
            h.confidence,
            h.feedback,
            h.date,
            u.name AS user_name,
            u.email AS user_email
        FROM history h
        LEFT JOIN users u
            ON h.user_id = u.id
        ORDER BY h.date DESC
    """)

    history = [
        dict(row)
        for row in cursor.fetchall()
    ]

    conn.close()

    return history

# =========================================================
# UPDATE USER FEEDBACK
# =========================================================

def update_history_feedback(
    entry_id,
    feedback,
    user_id
):
    if feedback not in ("yes", "no"):
        return False

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE history
        SET feedback = ?
        WHERE id = ?
        AND user_id = ?
    """, (
        feedback,
        entry_id,
        user_id
    ))

    conn.commit()

    updated = cursor.rowcount > 0

    conn.close()

    return updated

# =========================================================
# DELETE USER'S OWN HISTORY
# =========================================================

def delete_history_entry(
    entry_id,
    user_id
):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM history
        WHERE id = ?
        AND user_id = ?
    """, (
        entry_id,
        user_id
    ))

    conn.commit()

    deleted = cursor.rowcount > 0

    conn.close()

    return deleted

# =========================================================
# ADMIN DELETE HISTORY
# =========================================================

def admin_delete_history_entry(entry_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        DELETE FROM history
        WHERE id = ?
    """, (entry_id,))

    conn.commit()

    deleted = cursor.rowcount > 0

    conn.close()

    return deleted

# =========================================================
# USER DASHBOARD STATISTICS
# IMPORTANT:
# Every value below belongs ONLY to the authenticated user.
# =========================================================

def get_user_dashboard_stats(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    # User name
    cursor.execute("""
        SELECT name
        FROM users
        WHERE id = ?
    """, (user_id,))

    user_row = cursor.fetchone()

    user_name = (
        user_row["name"]
        if user_row
        else "User"
    )

    # Total audits
    cursor.execute("""
        SELECT COUNT(*)
        FROM history
        WHERE user_id = ?
    """, (user_id,))

    total_predictions = cursor.fetchone()[0]

    # Real
    cursor.execute("""
        SELECT COUNT(*)
        FROM history
        WHERE user_id = ?
        AND prediction LIKE '%REAL%'
    """, (user_id,))

    real_count = cursor.fetchone()[0]

    # Fake
    cursor.execute("""
        SELECT COUNT(*)
        FROM history
        WHERE user_id = ?
        AND prediction LIKE '%FAKE%'
    """, (user_id,))

    fake_count = cursor.fetchone()[0]

    # Correct feedback
    cursor.execute("""
        SELECT COUNT(*)
        FROM history
        WHERE user_id = ?
        AND feedback = 'yes'
    """, (user_id,))

    feedback_correct = cursor.fetchone()[0]

    # Incorrect feedback
    cursor.execute("""
        SELECT COUNT(*)
        FROM history
        WHERE user_id = ?
        AND feedback = 'no'
    """, (user_id,))

    feedback_incorrect = cursor.fetchone()[0]

    # Last 7 days for THIS USER
    cursor.execute("""
        SELECT
            date(date) AS day,
            COUNT(*) AS count
        FROM history
        WHERE user_id = ?
        GROUP BY day
        ORDER BY day DESC
        LIMIT 7
    """, (user_id,))

    daily_stats = [
        dict(row)
        for row in cursor.fetchall()
    ]

    conn.close()

    return {
        "user_name": user_name,
        "total_predictions": total_predictions,
        "real_count": real_count,
        "fake_count": fake_count,
        "feedback_correct": feedback_correct,
        "feedback_incorrect": feedback_incorrect,
        "daily_stats": daily_stats
    }

# =========================================================
# GLOBAL ADMIN DASHBOARD STATISTICS
# =========================================================

def get_dashboard_stats():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*)
        FROM users
        WHERE role = 'user'
    """)

    total_users = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM history
    """)

    total_predictions = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM history
        WHERE prediction LIKE '%REAL%'
    """)

    real_count = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM history
        WHERE prediction LIKE '%FAKE%'
    """)

    fake_count = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM history
        WHERE feedback = 'yes'
    """)

    feedback_correct = cursor.fetchone()[0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM history
        WHERE feedback = 'no'
    """)

    feedback_incorrect = cursor.fetchone()[0]

    cursor.execute("""
        SELECT
            date(date) AS day,
            COUNT(*) AS count
        FROM history
        GROUP BY day
        ORDER BY day DESC
        LIMIT 7
    """)

    daily_stats = [
        dict(row)
        for row in cursor.fetchall()
    ]

    conn.close()

    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "real_count": real_count,
        "fake_count": fake_count,
        "feedback_correct": feedback_correct,
        "feedback_incorrect": feedback_incorrect,
        "daily_stats": daily_stats
    }