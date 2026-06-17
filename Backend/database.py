import aiosqlite
from config import settings

DB = settings.db_path

CREATE_SCHEMA = """
CREATE TABLE IF NOT EXISTS syllabi (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL DEFAULT 'dev-user-01',
    filename    TEXT,
    raw_text    TEXT,
    parsed_json TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
    id          TEXT PRIMARY KEY,
    syllabus_id TEXT,
    topic_id    TEXT NOT NULL,
    topic_name  TEXT NOT NULL,
    subject     TEXT NOT NULL,
    content_json TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_topic_id ON notes (topic_id);
CREATE INDEX IF NOT EXISTS idx_syllabi_user   ON syllabi (user_id);
"""


async def init_db() -> None:
    async with aiosqlite.connect(DB) as db:
        await db.executescript(CREATE_SCHEMA)
        await db.commit()


async def get_db() -> aiosqlite.Connection:
    """Dependency — yields an open connection, caller closes it."""
    db = await aiosqlite.connect(DB)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
