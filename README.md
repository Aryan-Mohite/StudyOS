# StudyOS

> Syllabus-first AI learning platform for Indian engineering students.

```
StudyOS/
├── Frontend/     Vite + React 19 landing page
├── Backend/      FastAPI (Python) REST API
└── Database/     MySQL schema + Qdrant vector store setup
```

---

## Quick start

### Frontend
```bash
cd Frontend
npm install        # installs lucide-react, react, react-dom, vite
npm run dev        # http://localhost:3000
```

### Backend
```bash
cd Backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in your keys
uvicorn main:app --reload     # http://localhost:8000
```

### Database
```bash
# MySQL
mysql -u root -p < Database/schema.sql
mysql -u root -p studyos < Database/seed.sql

# Qdrant (Docker)
docker run -p 6333:6333 qdrant/qdrant
python Database/qdrant_setup.py
```

---

## Bugs fixed in this version

| # | File | Issue |
|---|------|-------|
| 1 | `Frontend/package.json` | `lucide-react` was missing from dependencies — caused runtime crash |
| 2 | `Frontend/src/index.css` | `#root { width: 1126px; border-inline }` boxed the full-width layout |
| 3 | `Frontend/src/index.css` | Global `h1/h2 { font-weight: 500 }` fought component inline `700` weights |
| 4 | `Frontend/src/App.css` | Entire file was Vite starter boilerplate — dead code, never imported |
| 5 | `Frontend/index.html` | `<title>studyos</title>` was lowercase |
| 6 | `Frontend/src/index.css` | `@media prefers-color-scheme:dark` flipped backgrounds against the hard-coded light theme |
| 7 | `Frontend/src/index.css` | `font: 18px/145%` root font-size broke spacing assumptions |
| 8 | `Frontend/vite.config.js` | Added `/api` proxy to Backend — dev requests forwarded to FastAPI |
