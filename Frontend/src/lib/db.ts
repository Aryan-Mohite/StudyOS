/**
 * StudyOS — MySQL data layer
 *
 * Replaces the old Backend-Express/src/db.js (better-sqlite3) cache layer.
 * Lives inside Next.js now, used only from Route Handlers (server-side),
 * never imported into client components.
 *
 * Connection is a singleton pool — safe to import from multiple route
 * handlers within the same server process.
 *
 * Configure via DATABASE_URL in .env.local, e.g.:
 *   DATABASE_URL=mysql://user:password@host:3306/studyos
 *
 * Or PlanetScale / Railway / Aiven connection strings work the same way
 * (add ?ssl={"rejectUnauthorized":true} if your provider requires SSL).
 */

import mysql from "mysql2/promise";

let _pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (_pool) return _pool;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to Frontend/.env.local — see .env.local.example.",
    );
  }

  _pool = mysql.createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  return _pool;
}

const CREATE_SCHEMA = `
CREATE TABLE IF NOT EXISTS syllabi (
  id           VARCHAR(64) PRIMARY KEY,
  user_id      VARCHAR(128) NOT NULL DEFAULT 'dev-user-01',
  filename     VARCHAR(512),
  raw_text     LONGTEXT,
  parsed_json  LONGTEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_syllabi_user (user_id)
);

CREATE TABLE IF NOT EXISTS notes (
  id           VARCHAR(64) PRIMARY KEY,
  syllabus_id  VARCHAR(64),
  topic_id     VARCHAR(128) NOT NULL,
  topic_name   VARCHAR(512) NOT NULL,
  subject      VARCHAR(256) NOT NULL,
  content_json LONGTEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notes_topic_id (topic_id)
);

CREATE TABLE IF NOT EXISTS mcq_sets (
  id           VARCHAR(64) PRIMARY KEY,
  syllabus_id  VARCHAR(64),
  topic_id     VARCHAR(128) NOT NULL,
  topic_name   VARCHAR(512) NOT NULL,
  subject      VARCHAR(256) NOT NULL,
  difficulty   VARCHAR(32) NOT NULL DEFAULT 'mixed',
  content_json LONGTEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mcq_sets_topic_id (topic_id)
);

CREATE TABLE IF NOT EXISTS numerical_sets (
  id           VARCHAR(64) PRIMARY KEY,
  syllabus_id  VARCHAR(64),
  topic_id     VARCHAR(128) NOT NULL,
  topic_name   VARCHAR(512) NOT NULL,
  subject      VARCHAR(256) NOT NULL,
  difficulty   VARCHAR(32) NOT NULL DEFAULT 'mixed',
  content_json LONGTEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_numerical_sets_topic_id (topic_id)
);
`;

let _initialized = false;

/** Idempotent — safe to call on every cold start (serverless functions). */
export async function initDb(): Promise<void> {
  if (_initialized) return;
  const pool = getPool();
  // mysql2 supports multiple statements only with multipleStatements:true,
  // so split and run sequentially to keep the pool config simple/safe.
  const statements = CREATE_SCHEMA.split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await pool.query(stmt);
  }
  _initialized = true;
}
