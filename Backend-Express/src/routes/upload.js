"use strict";

const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const { getDb } = require("../db");

const router = express.Router();

// Store files in memory — we forward them straight to AgenticService
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".pdf")) {
      return cb(new Error("Only PDF files are accepted."));
    }
    cb(null, true);
  },
});

const AGENTIC = process.env.AGENTIC_SERVICE_URL ?? "http://localhost:8000";

// ── POST /api/upload ──────────────────────────────────────────────────────────
router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ detail: "No PDF file provided." });
  }

  const userId = req.body.user_id ?? "dev-user-01";
  const filename = req.file.originalname;

  // Forward raw bytes to Python AgenticService for parsing
  try {
    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename,
      contentType: "application/pdf",
    });
    form.append("filename", filename);

    const { data: parsed } = await axios.post(
      `${AGENTIC}/agent/parse-syllabus`,
      form,
      { headers: form.getHeaders(), timeout: 60_000 }
    );

    // Cache in SQLite
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO syllabi (id, user_id, filename, parsed_json)
       VALUES (?, ?, ?, ?)`
    ).run(parsed.syllabus_id, userId, filename, JSON.stringify(parsed));

    return res.json(parsed);
  } catch (err) {
    const detail =
      err.response?.data?.detail ??
      err.message ??
      "Syllabus parsing failed.";
    const status = err.response?.status ?? 502;
    return res.status(status).json({ detail });
  }
});

// ── GET /api/upload/latest ────────────────────────────────────────────────────
router.get("/latest", (req, res) => {
  const userId = req.query.user_id ?? "dev-user-01";
  const db = getDb();

  const row = db
    .prepare(
      `SELECT parsed_json FROM syllabi
       WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(userId);

  if (!row) {
    return res.status(404).json({ detail: "No syllabus found for this user." });
  }
  return res.json(JSON.parse(row.parsed_json));
});

module.exports = router;
