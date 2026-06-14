# StudyOS — Database Layer

## MySQL (relational data)

```bash
# Create database and tables
mysql -u root -p < schema.sql

# Load sample seed data
mysql -u root -p studyos < seed.sql
```

## Qdrant (vector store)

Start Qdrant with Docker:
```bash
docker run -p 6333:6333 qdrant/qdrant
```

Then create collections:
```bash
python qdrant_setup.py
```

## Collections

| Collection      | Purpose                              |
|-----------------|--------------------------------------|
| `book_chunks`   | Textbook section embeddings          |
| `notes_chunks`  | Generated notes embeddings           |
| `pyq_chunks`    | Previous year question embeddings    |
