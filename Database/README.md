# StudyOS Database Layer

## Quick Start

```bash
# 1. MySQL
mysql -u root -p < schema.sql
mysql -u root -p studyos < seed.sql

# 2. Qdrant (Docker)
docker run -p 6333:6333 qdrant/qdrant
python qdrant_setup.py
```

## Schema Overview

| Table          | Purpose                              |
|----------------|--------------------------------------|
| users          | Clerk-authenticated students         |
| subjects       | Subject catalog                      |
| syllabi        | Uploaded syllabus PDFs               |
| topics         | Parsed units and subtopics           |
| books          | Uploaded reference textbooks         |
| notes          | AI-generated notes                   |
| quizzes        | MCQ/viva/interview question sets     |
| progress       | Per-user topic completion + scores   |
| chat_sessions  | AI tutor conversation sessions       |
| chat_messages  | Individual tutor messages            |

## Qdrant Collections

| Collection    | Stores                               |
|---------------|--------------------------------------|
| book_chunks   | Textbook section embeddings          |
| notes_chunks  | Generated notes embeddings           |
| pyq_chunks    | Previous year question embeddings    |
