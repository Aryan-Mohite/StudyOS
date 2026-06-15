from sqlalchemy import String, SmallInteger, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id:           Mapped[int]  = mapped_column(primary_key=True, autoincrement=True)
    clerk_id:     Mapped[str]  = mapped_column(String(128), unique=True, index=True)
    name:         Mapped[str]  = mapped_column(String(100))
    email:        Mapped[str]  = mapped_column(String(255), unique=True)
    university:   Mapped[str | None] = mapped_column(String(150))
    branch:       Mapped[str | None] = mapped_column(String(100))
    semester:     Mapped[int | None] = mapped_column(SmallInteger)
    created_at:   Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
