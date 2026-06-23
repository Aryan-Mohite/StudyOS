"use strict";

const express = require("express");
const axios = require("axios");
const { getDb } = require("../db");

const router = express.Router();
const AGENTIC = process.env.AGENTIC_SERVICE_URL ?? "http://localhost:8000";

// ── POST /api/notes/generate ──────────────────────────────────────────────────
router.post("/generate", async (req, res) => {
  const {
    topic_id,
    topic_name,
    subject,
    unit_title,
    syllabus_context = [],
    syllabus_id = "",
    force_regenerate = false,
  } = req.body;

  if (!topic_id || !topic_name || !subject || !unit_title) {
    return res.status(400).json({
      detail: "topic_id, topic_name, subject, and unit_title are required.",
    });
  }

  const db = getDb();

  // ── Cache check ──────────────────────────────────────────────────────────
  if (!force_regenerate) {
    const row = db
      .prepare(
        `SELECT content_json FROM notes
         WHERE topic_id = ?
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(topic_id);

    if (row) {
      const cached = JSON.parse(row.content_json);
      cached._cached = true;
      return res.json(cached);
    }
  }

  // ── Delegate to AgenticService ───────────────────────────────────────────
  try {
    const { data: notes } = await axios.post(
      `${AGENTIC}/agent/generate-notes`,
      { topic_id, topic_name, subject, unit_title, syllabus_context },
      { timeout: 60_000 }
    );

    // Cache result
    db.prepare(
      `INSERT OR REPLACE INTO notes
         (id, syllabus_id, topic_id, topic_name, subject, content_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      notes.note_id,
      syllabus_id,
      topic_id,
      topic_name,
      subject,
      JSON.stringify(notes)
    );

    notes._cached = false;
    return res.json(notes);
  } catch (err) {
    const detail =
      err.response?.data?.detail ?? err.message ?? "Notes generation failed.";
    const status = err.response?.status ?? 502;
    return res.status(status).json({ detail });
  }
});

// ── GET /api/notes/:topicId ───────────────────────────────────────────────────
router.get("/:topicId", (req, res) => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT content_json FROM notes
       WHERE topic_id = ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(req.params.topicId);

  if (!row) {
    return res.status(404).json({ detail: "Notes not found for this topic." });
  }
  return res.json(JSON.parse(row.content_json));
});

// ── DELETE /api/notes/:topicId ────────────────────────────────────────────────
router.delete("/:topicId", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM notes WHERE topic_id = ?").run(req.params.topicId);
  return res.json({ deleted: true, topic_id: req.params.topicId });
});

module.exports = router;
