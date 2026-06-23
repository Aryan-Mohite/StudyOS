"use strict";

const BetterSQLite = require("better-sqlite3");
const path = require("path");
require("dotenv").config();

const DB_PATH = process.env.DB_PATH ?? "studyos.db";

/** Singleton connection — better-sqlite3 is synchronous, no pool needed. */
let _db = null;

function getDb() {
  if (_db) return _db;
  _db = new BetterSQLite(path.resolve(DB_PATH));
  _db.pragma("journal_mode = WAL"); // enables concurrent reads
  _db.pragma("foreign_keys = ON");
  return _db;
}

const CREATE_SCHEMA = `
CREATE TABLE IF NOT EXISTS syllabi (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL DEFAULT 'dev-user-01',
  filename     TEXT,
  raw_text     TEXT,
  parsed_json  TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
  id           TEXT PRIMARY KEY,
  syllabus_id  TEXT,
  topic_id     TEXT NOT NULL,
  topic_name   TEXT NOT NULL,
  subject      TEXT NOT NULL,
  content_json TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mcq_sets (
  id           TEXT PRIMARY KEY,
  syllabus_id  TEXT,
  topic_id     TEXT NOT NULL,
  topic_name   TEXT NOT NULL,
  subject      TEXT NOT NULL,
  difficulty   TEXT NOT NULL DEFAULT 'mixed',
  content_json TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_topic_id    ON notes (topic_id);
CREATE INDEX IF NOT EXISTS idx_mcq_sets_topic_id ON mcq_sets (topic_id);
CREATE INDEX IF NOT EXISTS idx_syllabi_user       ON syllabi (user_id);
`;

function initDb() {
  const db = getDb();
  db.exec(CREATE_SCHEMA);
  console.log(`[DB] SQLite ready at ${path.resolve(DB_PATH)}`);
}

module.exports = { getDb, initDb };
