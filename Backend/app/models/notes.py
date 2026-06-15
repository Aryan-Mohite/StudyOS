from sqlalchemy import ForeignKey, Text, Enum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base
import enum


class NoteType(str, enum.Enum):
    long     = "long"
    short    = "short"
    revision = "revision"


class Note(Base):
    __tablename__ = "notes"
    id:           Mapped[int]      = mapped_column(primary_key=True, autoincrement=True)
    topic_id:     Mapped[int]      = mapped_column(ForeignKey("topics.id", ondelete="CASCADE"))
    note_type:    Mapped[NoteType] = mapped_column(Enum(NoteType), default=NoteType.long)
    content:      Mapped[str]      = mapped_column(Text)
    generated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
