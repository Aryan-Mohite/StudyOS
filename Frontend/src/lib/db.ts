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
CREATE TABLE IF NOT EXISTS user_profile (
  user_id          VARCHAR(128) PRIMARY KEY,
  name             VARCHAR(255),
  education_level  VARCHAR(100),
  course           VARCHAR(100),
  university       VARCHAR(100),
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notebooks (
  id           VARCHAR(64) PRIMARY KEY,
  user_id      VARCHAR(128) NOT NULL,
  subject_name VARCHAR(255),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notebooks_user (user_id)
);

CREATE TABLE IF NOT EXISTS syllabi (
  id           VARCHAR(64) PRIMARY KEY,
  user_id      VARCHAR(128) NOT NULL DEFAULT 'dev-user-01',
  notebook_id  VARCHAR(64),
  filename     VARCHAR(512),
  raw_text     LONGTEXT,
  parsed_json  LONGTEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_syllabi_user (user_id),
  INDEX idx_syllabi_notebook (notebook_id)
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

CREATE TABLE IF NOT EXISTS study_plans (
  id           VARCHAR(64) PRIMARY KEY,
  user_id      VARCHAR(128) NOT NULL DEFAULT 'dev-user-01',
  syllabus_id  VARCHAR(64) NOT NULL,
  exam_date    DATE NOT NULL,
  content_json LONGTEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_study_plans_user (user_id),
  INDEX idx_study_plans_syllabus (syllabus_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id    VARCHAR(256) NOT NULL,
  user_id       VARCHAR(128) NOT NULL,
  topic_id      VARCHAR(128) NOT NULL,
  topic_name    VARCHAR(512) NOT NULL,
  subject       VARCHAR(256) NOT NULL,
  role          VARCHAR(16) NOT NULL,
  content       LONGTEXT NOT NULL,
  out_of_scope  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_messages_session (session_id, created_at),
  INDEX idx_chat_messages_user (user_id, created_at)
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

  await migrateSchema(pool);
  _initialized = true;
}

/**
 * `CREATE TABLE IF NOT EXISTS` only helps on a fresh database — it does
 * nothing for a `syllabi` table that already existed before the notebooks
 * feature was added (which is exactly what caused "Unknown column
 * 'notebook_id' in 'field list'"). This adds any columns/indexes that are
 * missing on tables that already existed, so upgrading an existing DB
 * doesn't require running SQL by hand.
 */
async function migrateSchema(pool: mysql.Pool): Promise<void> {
  const [dbRows] = await pool.query<mysql.RowDataPacket[]>("SELECT DATABASE() AS db");
  const dbName = dbRows[0]?.db;
  if (!dbName) return;

  const [columnRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'syllabi'`,
    [dbName],
  );
  const existingColumns = new Set(columnRows.map((r) => r.COLUMN_NAME as string));

  if (!existingColumns.has("notebook_id")) {
    await pool.query(`ALTER TABLE syllabi ADD COLUMN notebook_id VARCHAR(64)`);
    // Index creation can fail harmlessly if it somehow already exists —
    // don't let that abort startup.
    try {
      await pool.query(`ALTER TABLE syllabi ADD INDEX idx_syllabi_notebook (notebook_id)`);
    } catch {
      /* index already present — ignore */
    }
  }
}

/**
 * Looks up the notebook a syllabus belongs to (every syllabus auto-creates
 * one on upload). Returns null if the syllabus is unknown or predates the
 * notebooks feature — callers should treat that as "use the legacy global
 * RAG collection" rather than an error.
 */
export async function getNotebookIdForSyllabus(syllabusId: string): Promise<string | null> {
  await initDb();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT notebook_id FROM syllabi WHERE id = ? LIMIT 1`,
    [syllabusId],
  );
  const row = (rows as Array<{ notebook_id: string | null }>)[0];
  return row?.notebook_id ?? null;
}
