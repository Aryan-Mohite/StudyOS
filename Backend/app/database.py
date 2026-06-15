"""SQLAlchemy async engine + Qdrant client singleton."""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from qdrant_client import QdrantClient
from app.config import get_settings

cfg = get_settings()

# ── MySQL (async) ────────────────────────────────────────────────────────
_async_url = cfg.database_url.replace("mysql+pymysql", "mysql+aiomysql")
engine = create_async_engine(_async_url, echo=cfg.environment == "development")
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# ── Qdrant ───────────────────────────────────────────────────────────────
_qdrant_client: QdrantClient | None = None


def get_qdrant() -> QdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClient(host=cfg.qdrant_host, port=cfg.qdrant_port)
    return _qdrant_client
