"use strict";

const express = require("express");
const axios = require("axios");
const { getDb } = require("../db");

const router = express.Router();
const AGENTIC = process.env.AGENTIC_SERVICE_URL ?? "http://localhost:8000";

const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard", "mixed"]);

// ── POST /api/mcq/generate ────────────────────────────────────────────────────
router.post("/generate", async (req, res) => {
  const {
    topic_id,
    topic_name,
    subject,
    count = 10,
    difficulty = "mixed",
    syllabus_context = [],
    syllabus_id = "",
    force_regenerate = false,
  } = req.body;

  if (!topic_id || !topic_name || !subject) {
    return res.status(400).json({
      detail: "topic_id, topic_name, and subject are required.",
    });
  }

  if (!VALID_DIFFICULTIES.has(difficulty)) {
    return res.status(400).json({
      detail: `difficulty must be one of: ${[...VALID_DIFFICULTIES].join(", ")}`,
    });
  }

  const safeCount = Math.max(1, Math.min(Number(count) || 10, 20));
  const db = getDb();

  // ── Cache check ──────────────────────────────────────────────────────────
  if (!force_regenerate) {
    const row = db
      .prepare(
        `SELECT content_json FROM mcq_sets
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
    const { data: mcqSet } = await axios.post(
      `${AGENTIC}/agent/generate-mcq`,
      { topic_id, topic_name, subject, count: safeCount, difficulty, syllabus_context },
      { timeout: 60_000 }
    );

    // Cache result
    db.prepare(
      `INSERT OR REPLACE INTO mcq_sets
         (id, syllabus_id, topic_id, topic_name, subject, difficulty, content_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      mcqSet.mcq_set_id,
      syllabus_id,
      topic_id,
      topic_name,
      subject,
      difficulty,
      JSON.stringify(mcqSet)
    );

    mcqSet._cached = false;
    return res.json(mcqSet);
  } catch (err) {
    const detail =
      err.response?.data?.detail ?? err.message ?? "MCQ generation failed.";
    const status = err.response?.status ?? 502;
    return res.status(status).json({ detail });
  }
});

// ── GET /api/mcq/:topicId ─────────────────────────────────────────────────────
router.get("/:topicId", (req, res) => {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT content_json FROM mcq_sets
       WHERE topic_id = ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(req.params.topicId);

  if (!row) {
    return res.status(404).json({ detail: "MCQ set not found for this topic." });
  }
  return res.json(JSON.parse(row.content_json));
});

// ── DELETE /api/mcq/:topicId ──────────────────────────────────────────────────
router.delete("/:topicId", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM mcq_sets WHERE topic_id = ?").run(req.params.topicId);
  return res.json({ deleted: true, topic_id: req.params.topicId });
});

module.exports = router;
