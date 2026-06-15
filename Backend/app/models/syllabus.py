from sqlalchemy import String, SmallInteger, ForeignKey, Text, Enum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import enum


class Difficulty(str, enum.Enum):
    easy   = "easy"
    medium = "medium"
    hard   = "hard"


class Subject(Base):
    __tablename__ = "subjects"
    id:           Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    subject_name: Mapped[str] = mapped_column(String(200))
    semester:     Mapped[int | None] = mapped_column(SmallInteger)
    branch:       Mapped[str | None] = mapped_column(String(100))
    university:   Mapped[str | None] = mapped_column(String(150))


class Syllabus(Base):
    __tablename__ = "syllabi"
    id:         Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"))
    user_id:    Mapped[int] = mapped_column(ForeignKey("users.id",    ondelete="CASCADE"))
    pdf_url:    Mapped[str | None] = mapped_column(Text)
    parsed_at:  Mapped[DateTime | None] = mapped_column(DateTime)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    topics:     Mapped[list["Topic"]] = relationship(back_populates="syllabus", cascade="all, delete-orphan")


class Topic(Base):
    __tablename__ = "topics"
    id:           Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    syllabus_id:  Mapped[int] = mapped_column(ForeignKey("syllabi.id", ondelete="CASCADE"))
    unit_number:  Mapped[int | None] = mapped_column(SmallInteger)
    topic:        Mapped[str] = mapped_column(String(200))
    subtopic:     Mapped[str | None] = mapped_column(String(200))
    difficulty:   Mapped[Difficulty] = mapped_column(Enum(Difficulty), default=Difficulty.medium)
    syllabus:     Mapped["Syllabus"] = relationship(back_populates="topics")
