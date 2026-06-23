"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { initDb } = require("./db");

const uploadRouter = require("./routes/upload");
const notesRouter  = require("./routes/notes");
const mcqRouter    = require("./routes/mcq");

// ── App setup ─────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT ?? 3001;

// CORS — allow frontend origins
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/upload", uploadRouter);
app.use("/api/notes",  notesRouter);
app.use("/api/mcq",    mcqRouter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0", layer: "express-gateway" });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[Express error]", err.message);
  res.status(err.status ?? 500).json({ detail: err.message ?? "Internal server error." });
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDb();
app.listen(PORT, () => {
  console.log(`[StudyOS Express] listening on http://localhost:${PORT}`);
  console.log(`[StudyOS Express] AgenticService → ${process.env.AGENTIC_SERVICE_URL ?? "http://localhost:8000"}`);
});
