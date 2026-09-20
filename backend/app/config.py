import os
import sqlite3
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"))

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
PORT = int(os.getenv("PORT", "8000"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "conversations.db")
MAX_ITERATIONS = 10
MAX_TOKENS = 8192
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

os.makedirs(UPLOAD_DIR, exist_ok=True)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            messages TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS meetings (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            company TEXT,
            contact_name TEXT,
            meeting_date TEXT,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'planifie',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Réunion Stratégique wizard output, added to the existing meetings table
    # rather than a separate one -- one row per meeting stays the single
    # source of truth whether it was created from the quick form or the wizard.
    for column in ("agenda", "briefs", "facilitation_guide", "minutes", "action_plan", "follow_up_email"):
        try:
            conn.execute(f"ALTER TABLE meetings ADD COLUMN {column} TEXT")
        except sqlite3.OperationalError:
            pass  # column already exists from a previous startup
    conn.execute("""
        CREATE TABLE IF NOT EXISTS deals (
            id TEXT PRIMARY KEY,
            company TEXT NOT NULL,
            contact_name TEXT,
            stage TEXT NOT NULL DEFAULT 'prospection',
            value REAL,
            close_date TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()
