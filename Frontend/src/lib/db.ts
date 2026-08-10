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
 * Works with PlanetScale / Railway / Aiven / local MySQL. Managed providers
 * that enforce TLS (Aiven does) need DB_SSL_CA set too — see env.ts and the
 * ssl option below.
 */

import mysql from "mysql2/promise";
import { getEnv } from "./env";

let _pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (_pool) return _pool;

  const env = getEnv();

  _pool = mysql.createPool({
    uri: env.DATABASE_URL,
    waitForConnections: true,
    // Configurable via DB_POOL_SIZE — default 10 is fine for the single-VPS
    // deployment this project is planned for (see ARCHITECTURE.md); raise it
    // if profiling shows requests queueing for a connection under load.
    connectionLimit: env.DB_POOL_SIZE,
    queueLimit: 0,
    // Detects and drops dead connections (e.g. after a MySQL restart or an
    // idle-connection timeout on a managed provider) instead of handing out
    // a connection that will fail on first use.
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    // Fail fast on a hung connection attempt rather than let a request hang
    // indefinitely waiting on the pool.
    connectTimeout: 10_000,
    // Aiven (and most managed MySQL providers) enforce TLS and won't accept
    // connections without it. If DB_SSL_CA is set, verify against it
    // properly; otherwise fall back to rejectUnauthorized (works if the
    // provider's cert chains to a publicly trusted CA — check your
    // provider's docs if connections fail with a cert error).
    ssl: env.DB_SSL_CA ? { ca: env.DB_SSL_CA, rejectUnauthorized: true } : undefined,
  });

  return _pool;
}

const CREATE_DAILY_GOALS = `
CREATE TABLE IF NOT EXISTS daily_goals (
  user_id              VARCHAR(128) NOT NULL,
  syllabus_id          VARCHAR(64) NOT NULL,
  goal_date             DATE NOT NULL,
  target_questions      INT NOT NULL DEFAULT 10,
  completed_questions   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, syllabus_id, goal_date)
)`;

const CREATE_WEEKLY_GOALS = `
CREATE TABLE IF NOT EXISTS weekly_goals (
  user_id            VARCHAR(128) NOT NULL,
  syllabus_id        VARCHAR(64) NOT NULL,
  week_start         DATE NOT NULL,       -- Monday of the target week
  target_topics      INT NOT NULL DEFAULT 5,
  completed_topics    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, syllabus_id, week_start)
)`;

const CREATE_SCHEMA = `
CREATE TABLE IF NOT EXISTS user_profile (
  user_id          VARCHAR(128) PRIMARY KEY,
  name             VARCHAR(255),
  education_level  VARCHAR(100),
  course           VARCHAR(100),
  university       VARCHAR(100),
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS syllabi (
  id           VARCHAR(64) PRIMARY KEY,
  user_id      VARCHAR(128) NOT NULL,
  filename     VARCHAR(512),
  raw_text     LONGTEXT,
  parsed_json  LONGTEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_syllabi_user_created (user_id, created_at)
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

CREATE TABLE IF NOT EXISTS study_plans (
  id           VARCHAR(64) PRIMARY KEY,
  user_id      VARCHAR(128) NOT NULL,
  syllabus_id  VARCHAR(64) NOT NULL,
  exam_date    DATE NOT NULL,
  content_json LONGTEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_study_plans_user (user_id),
  INDEX idx_study_plans_syllabus (syllabus_id)
);

-- ── Personalized Learning ──────────────────────────────────────────────────
-- Every graded MCQ attempt lands here first. topic_mastery and
-- revision_schedule are rollups kept in sync on write, so reads (dashboard,
-- progress page) never have to scan raw attempts. This mirrors the
-- cache-first pattern used everywhere else: write once, read the rollup.

CREATE TABLE IF NOT EXISTS attempts (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       VARCHAR(128) NOT NULL,
  syllabus_id   VARCHAR(64),
  topic_id      VARCHAR(128) NOT NULL,
  topic_name    VARCHAR(512) NOT NULL,
  subject       VARCHAR(256) NOT NULL,
  content_type  VARCHAR(16) NOT NULL,      -- 'mcq'
  difficulty    VARCHAR(32) NOT NULL,       -- 'easy' | 'medium' | 'hard'
  is_correct    BOOLEAN NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attempts_user_topic (user_id, topic_id),
  INDEX idx_attempts_user_date (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS topic_mastery (
  user_id            VARCHAR(128) NOT NULL,
  topic_id           VARCHAR(128) NOT NULL,
  topic_name         VARCHAR(512) NOT NULL,
  subject            VARCHAR(256) NOT NULL,
  syllabus_id        VARCHAR(64),
  total_attempts     INT NOT NULL DEFAULT 0,
  correct_attempts   INT NOT NULL DEFAULT 0,
  mastery_score      DECIMAL(5,2) NOT NULL DEFAULT 0,  -- 0-100
  last_attempted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS revision_schedule (
  user_id            VARCHAR(128) NOT NULL,
  topic_id           VARCHAR(128) NOT NULL,
  topic_name         VARCHAR(512) NOT NULL,
  subject            VARCHAR(256) NOT NULL,
  syllabus_id        VARCHAR(64),
  interval_days      INT NOT NULL DEFAULT 1,
  next_review_date   DATE NOT NULL,
  last_reviewed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, topic_id),
  INDEX idx_revision_user_date (user_id, next_review_date)
);

-- Scoped per (user, syllabus) rather than just per user — a daily/weekly
-- goal and the streak derived from it are "how am I doing on THIS
-- syllabus", not one continuous counter that bleeds into whatever syllabus
-- the student uploads next.
${CREATE_DAILY_GOALS};

${CREATE_WEEKLY_GOALS};

-- ── Reference material ───────────────────────────────────────────────────
-- The AgenticService indexes the actual PDF text into a per-syllabus Chroma
-- collection (see App/services/rag_service.py) — this table is just the
-- MySQL-side record of *which* files were uploaded, so the UI can list them
-- back to the student without re-querying the vector store.

CREATE TABLE IF NOT EXISTS reference_materials (
  id             VARCHAR(64) PRIMARY KEY,
  user_id        VARCHAR(128) NOT NULL,
  syllabus_id    VARCHAR(64) NOT NULL,
  filename       VARCHAR(512) NOT NULL,
  chunks_indexed INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reference_materials_syllabus (syllabus_id)
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
 * nothing to a table that already existed under an older schema. This
 * brings an existing DB in line with the current schema so upgrading
 * doesn't require running SQL by hand.
 */
async function migrateSchema(pool: mysql.Pool): Promise<void> {
  const [dbRows] = await pool.query<mysql.RowDataPacket[]>("SELECT DATABASE() AS db");
  const dbName = dbRows[0]?.db;
  if (!dbName) return;

  // The AI Tutor and Numericals features have been removed. Their tables —
  // and the notebooks/notebook_id linkage that existed solely to scope the
  // Tutor's RAG retrieval — are dead weight on any install created before
  // this cleanup. Drop them so an upgraded DB matches the current schema
  // instead of accumulating unused tables forever.
  for (const table of ["numerical_sets", "chat_messages", "chat_faq_cache", "notebooks"] as const) {
    await pool.query(`DROP TABLE IF EXISTS ${table}`);
  }

  const [syllabiColumnRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'syllabi'`,
    [dbName],
  );
  const existingSyllabiColumns = new Set(syllabiColumnRows.map((r) => r.COLUMN_NAME as string));
  if (existingSyllabiColumns.has("notebook_id")) {
    try {
      await pool.query(`ALTER TABLE syllabi DROP INDEX idx_syllabi_notebook`);
    } catch {
      /* index already absent — ignore */
    }
    await pool.query(`ALTER TABLE syllabi DROP COLUMN notebook_id`);
  }

  // Every route that writes user_id now requires a real Clerk session (see
  // middleware.ts) — the "dev-user-01" placeholder default is dead. Drop it
  // from installs that were created before this schema was tightened; a
  // fresh CREATE TABLE IF NOT EXISTS above already omits it, but that clause
  // does nothing to a table that already exists.
  for (const table of ["syllabi", "study_plans"] as const) {
    const [defaultRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COLUMN_DEFAULT FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'user_id'`,
      [dbName, table],
    );
    if (defaultRows[0]?.COLUMN_DEFAULT === "dev-user-01") {
      await pool.query(`ALTER TABLE ${table} ALTER COLUMN user_id DROP DEFAULT`);
    }
  }

  // daily_goals/weekly_goals moved from "one counter per user" to "one
  // counter per (user, syllabus)" — see the multi-notebook isolation fix.
  // Old rows can't be attributed to a syllabus after the fact, and this
  // project has no production data yet, so an existing table on the old
  // schema is dropped and rebuilt empty rather than migrated in place.
  for (const table of ["daily_goals", "weekly_goals"] as const) {
    const [colRows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [dbName, table],
    );
    const exists = colRows.length > 0;
    const hasSyllabusId = colRows.some((r) => r.COLUMN_NAME === "syllabus_id");
    if (exists && !hasSyllabusId) {
      await pool.query(`DROP TABLE IF EXISTS ${table}`);
    }
  }
  // Re-run the two CREATE TABLE IF NOT EXISTS statements so a table just
  // dropped above (or missing on a fresh DB that hit this function before
  // CREATE_SCHEMA somehow didn't create it) exists again before any query
  // in this same process tries to use it.
  await pool.query(CREATE_DAILY_GOALS);
  await pool.query(CREATE_WEEKLY_GOALS);

  // PERF FIX (see CHANGES-BUGFIXES.md): every dashboard page load runs
  // `SELECT ... FROM syllabi WHERE user_id = ? ORDER BY created_at DESC
  // LIMIT 1` (fetchLatestSyllabus) — the hottest read in the app. The
  // original single-column index on user_id only narrows the row set;
  // MySQL still needs a filesort to satisfy `ORDER BY created_at DESC`.
  // A composite (user_id, created_at) index lets it walk the index in
  // order and stop at the first row — no sort, no extra I/O. Installs
  // created before this fix still have the old single-column index (a
  // fresh `CREATE TABLE IF NOT EXISTS` above won't touch an existing
  // table's indexes), so add the composite one here if it's missing.
  const [syllabiIndexRows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'syllabi' AND INDEX_NAME = 'idx_syllabi_user_created'`,
    [dbName],
  );
  if (syllabiIndexRows.length === 0) {
    await pool.query(`ALTER TABLE syllabi ADD INDEX idx_syllabi_user_created (user_id, created_at)`);
    // The old single-column index is now redundant (any query that could
    // use it can use the composite index's leading column instead) —
    // drop it if present so writes don't pay for maintaining two indexes.
    try {
      await pool.query(`ALTER TABLE syllabi DROP INDEX idx_syllabi_user`);
    } catch {
      /* already absent on installs that only ever had the old name — ignore */
    }
  }
}

/**
 * True if `syllabusId` was uploaded by `userId`. Every route that scopes
 * personalized-learning data (progress, goals, revisions, dashboard) to a
 * syllabus_id supplied by the client calls this first, the same way
 * /api/reference and /api/plan/generate already verify ownership before
 * trusting a client-supplied syllabus_id.
 */
export async function syllabusBelongsToUser(syllabusId: string, userId: string): Promise<boolean> {
  await initDb();
  const pool = getPool();
  const [rows] = await pool.query(`SELECT 1 FROM syllabi WHERE id = ? AND user_id = ? LIMIT 1`, [
    syllabusId,
    userId,
  ]);
  return (rows as unknown[]).length > 0;
}

// ── Personalized Learning ───────────────────────────────────────────────────

/** YYYY-MM-DD in the server's local date — goals and revision dates are DATE, not TIMESTAMP. */
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Monday of the current week, as YYYY-MM-DD. */
function weekStartStr(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export interface RecordAttemptInput {
  userId: string;
  syllabusId: string;
  topicId: string;
  topicName: string;
  subject: string;
  contentType: "mcq";
  difficulty: "easy" | "medium" | "hard";
  isCorrect: boolean;
}

export interface AttemptRollup {
  mastery_score: number;
  total_attempts: number;
  correct_attempts: number;
  next_review_date: string;
}

/**
 * Records a single graded attempt and keeps the three downstream rollups
 * (topic_mastery, revision_schedule, daily_goals) in sync in the same call.
 * Read-modify-write rather than pure SQL for the spaced-repetition interval
 * because doubling an existing interval needs its previous value — fine at
 * this write volume (one row per answered question), consistent with the
 * project's lean-infra stance (no queue/worker for this).
 */
/**
 * BUG FIX + PERF (see CHANGES-BUGFIXES.md): this used to run five separate
 * `pool.query()` calls — each one checking out and returning its own
 * connection from the pool — with no transaction around them. Two problems:
 *   1. Correctness: if the process crashed or the connection dropped between
 *      any two of these writes (e.g. after recording the attempt but before
 *      updating topic_mastery), the rollup tables would permanently
 *      disagree with the attempts table, with nothing to reconcile them.
 *   2. Perf: this runs on every single MCQ answer — the hottest write path
 *      in the app — so 5x pool checkouts per attempt adds up fast under
 *      concurrent load (each checkout has real overhead: pool bookkeeping +
 *      a TCP round trip if the pool is momentarily exhausted).
 * Now: one connection, one transaction, all 5 statements on it, single
 * checkout/release. Rolls back cleanly on any failure instead of leaving
 * partial writes.
 */
export async function recordAttempt(input: RecordAttemptInput): Promise<AttemptRollup> {
  await initDb();
  const pool = getPool();
  const { userId, syllabusId, topicId, topicName, subject, contentType, difficulty, isCorrect } = input;
  const correctInt = isCorrect ? 1 : 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO attempts (user_id, syllabus_id, topic_id, topic_name, subject, content_type, difficulty, is_correct)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, syllabusId, topicId, topicName, subject, contentType, difficulty, correctInt],
    );

    await conn.query(
      `INSERT INTO topic_mastery (user_id, topic_id, topic_name, subject, syllabus_id, total_attempts, correct_attempts, mastery_score, last_attempted_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         total_attempts = total_attempts + 1,
         correct_attempts = correct_attempts + VALUES(correct_attempts),
         mastery_score = ROUND(100 * (correct_attempts + VALUES(correct_attempts)) / (total_attempts + 1), 2),
         last_attempted_at = NOW()`,
      [userId, topicId, topicName, subject, syllabusId, correctInt, isCorrect ? 100 : 0],
    );

    const [masteryRows] = await conn.query(
      `SELECT mastery_score, total_attempts, correct_attempts FROM topic_mastery WHERE user_id = ? AND topic_id = ?`,
      [userId, topicId],
    );
    const mastery = (masteryRows as Array<{ mastery_score: string; total_attempts: number; correct_attempts: number }>)[0];

    // Simplified SM-2-style spacing: correct doubles the interval (capped),
    // incorrect resets it to 1 day so the topic resurfaces almost immediately.
    const [revRows] = await conn.query(
      `SELECT interval_days FROM revision_schedule WHERE user_id = ? AND topic_id = ?`,
      [userId, topicId],
    );
    const prevInterval = (revRows as Array<{ interval_days: number }>)[0]?.interval_days ?? 0;
    const nextInterval = isCorrect ? Math.min(prevInterval > 0 ? prevInterval * 2 : 2, 30) : 1;
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
    const nextReviewStr = nextReviewDate.toISOString().slice(0, 10);

    await conn.query(
      `INSERT INTO revision_schedule (user_id, topic_id, topic_name, subject, syllabus_id, interval_days, next_review_date, last_reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         interval_days = VALUES(interval_days),
         next_review_date = VALUES(next_review_date),
         last_reviewed_at = NOW()`,
      [userId, topicId, topicName, subject, syllabusId, nextInterval, nextReviewStr],
    );

    await conn.query(
      `INSERT INTO daily_goals (user_id, syllabus_id, goal_date, completed_questions)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE completed_questions = completed_questions + 1`,
      [userId, syllabusId, todayStr()],
    );

    await conn.commit();

    return {
      mastery_score: Number(mastery?.mastery_score ?? (isCorrect ? 100 : 0)),
      total_attempts: mastery?.total_attempts ?? 1,
      correct_attempts: mastery?.correct_attempts ?? correctInt,
      next_review_date: nextReviewStr,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Difficulty suggestion derived from a student's own accuracy on a topic — never overrides their manual choice. */
export async function getSuggestedDifficulty(
  userId: string,
  topicId: string,
): Promise<"easy" | "medium" | "hard" | "mixed"> {
  await initDb();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT mastery_score, total_attempts FROM topic_mastery WHERE user_id = ? AND topic_id = ?`,
    [userId, topicId],
  );
  const row = (rows as Array<{ mastery_score: string; total_attempts: number }>)[0];
  if (!row || row.total_attempts < 3) return "mixed"; // not enough signal yet
  const score = Number(row.mastery_score);
  if (score < 40) return "easy";
  if (score < 75) return "medium";
  return "hard";
}

export interface DailyGoal {
  goal_date: string;
  target_questions: number;
  completed_questions: number;
}

export async function getOrCreateDailyGoal(userId: string, syllabusId: string): Promise<DailyGoal> {
  await initDb();
  const pool = getPool();
  const date = todayStr();
  await pool.query(
    `INSERT IGNORE INTO daily_goals (user_id, syllabus_id, goal_date) VALUES (?, ?, ?)`,
    [userId, syllabusId, date],
  );
  const [rows] = await pool.query(
    `SELECT goal_date, target_questions, completed_questions FROM daily_goals WHERE user_id = ? AND syllabus_id = ? AND goal_date = ?`,
    [userId, syllabusId, date],
  );
  const row = (rows as Array<{ goal_date: string; target_questions: number; completed_questions: number }>)[0];
  return {
    goal_date: date,
    target_questions: row?.target_questions ?? 10,
    completed_questions: row?.completed_questions ?? 0,
  };
}

export async function setDailyGoalTarget(userId: string, syllabusId: string, targetQuestions: number): Promise<DailyGoal> {
  await initDb();
  const pool = getPool();
  const date = todayStr();
  await pool.query(
    `INSERT INTO daily_goals (user_id, syllabus_id, goal_date, target_questions)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE target_questions = VALUES(target_questions)`,
    [userId, syllabusId, date, targetQuestions],
  );
  return getOrCreateDailyGoal(userId, syllabusId);
}

export interface WeeklyGoal {
  week_start: string;
  target_topics: number;
  completed_topics: number;
}

export async function getOrCreateWeeklyGoal(userId: string, syllabusId: string): Promise<WeeklyGoal> {
  await initDb();
  const pool = getPool();
  const weekStart = weekStartStr();
  await pool.query(
    `INSERT IGNORE INTO weekly_goals (user_id, syllabus_id, week_start) VALUES (?, ?, ?)`,
    [userId, syllabusId, weekStart],
  );
  // Distinct topics attempted this week for THIS syllabus — computed from
  // attempts rather than tracked incrementally, since "distinct" can't be
  // done with a simple counter.
  const [countRows] = await pool.query(
    `SELECT COUNT(DISTINCT topic_id) AS c FROM attempts WHERE user_id = ? AND syllabus_id = ? AND created_at >= ?`,
    [userId, syllabusId, weekStart],
  );
  const completed = (countRows as Array<{ c: number }>)[0]?.c ?? 0;

  const [rows] = await pool.query(
    `SELECT week_start, target_topics FROM weekly_goals WHERE user_id = ? AND syllabus_id = ? AND week_start = ?`,
    [userId, syllabusId, weekStart],
  );
  const row = (rows as Array<{ week_start: string; target_topics: number }>)[0];
  return {
    week_start: weekStart,
    target_topics: row?.target_topics ?? 5,
    completed_topics: completed,
  };
}

export async function setWeeklyGoalTarget(userId: string, syllabusId: string, targetTopics: number): Promise<WeeklyGoal> {
  await initDb();
  const pool = getPool();
  const weekStart = weekStartStr();
  await pool.query(
    `INSERT INTO weekly_goals (user_id, syllabus_id, week_start, target_topics)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE target_topics = VALUES(target_topics)`,
    [userId, syllabusId, weekStart, targetTopics],
  );
  return getOrCreateWeeklyGoal(userId, syllabusId);
}

/** Consecutive days (ending today or yesterday) with at least one completed question, for this syllabus. */
export async function getStreakDays(userId: string, syllabusId: string): Promise<number> {
  await initDb();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT goal_date FROM daily_goals
     WHERE user_id = ? AND syllabus_id = ? AND completed_questions > 0
     ORDER BY goal_date DESC LIMIT 60`,
    [userId, syllabusId],
  );
  const dates = (rows as Array<{ goal_date: string }>).map((r) =>
    typeof r.goal_date === "string" ? r.goal_date : new Date(r.goal_date).toISOString().slice(0, 10),
  );
  if (dates.length === 0) return 0;

  const today = todayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  if (dates[0] !== today && dates[0] !== yesterdayStr) return 0; // streak already broken

  let streak = 1;
  const cursor = new Date(dates[0]);
  for (let i = 1; i < dates.length; i++) {
    cursor.setDate(cursor.getDate() - 1);
    const expected = cursor.toISOString().slice(0, 10);
    if (dates[i] === expected) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export interface TopicMasteryRow {
  topic_id: string;
  topic_name: string;
  subject: string;
  total_attempts: number;
  correct_attempts: number;
  mastery_score: number;
  last_attempted_at: string;
}

/** Weakest topics first (lowest mastery), so both the dashboard and /progress can slice off the top N. Scoped to one syllabus so switching notebooks doesn't mix mastery data across them. */
export async function getTopicMastery(userId: string, syllabusId: string): Promise<TopicMasteryRow[]> {
  await initDb();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT topic_id, topic_name, subject, total_attempts, correct_attempts, mastery_score, last_attempted_at
     FROM topic_mastery WHERE user_id = ? AND syllabus_id = ? ORDER BY mastery_score ASC, total_attempts DESC`,
    [userId, syllabusId],
  );
  return (rows as Array<TopicMasteryRow & { mastery_score: string }>).map((r) => ({
    ...r,
    mastery_score: Number(r.mastery_score),
  }));
}

export interface ReferenceMaterial {
  id: string;
  filename: string;
  chunks_indexed: number;
  created_at: string;
}

/**
 * Records one successfully-ingested reference file. Call after the
 * AgenticService confirms indexing (see /api/reference/route.ts) — this
 * table is a listing convenience only, the vector store is the source of
 * truth for retrieval.
 */
export async function insertReferenceMaterial(input: {
  id: string;
  userId: string;
  syllabusId: string;
  filename: string;
  chunksIndexed: number;
}): Promise<void> {
  await initDb();
  const pool = getPool();
  await pool.query(
    `INSERT INTO reference_materials (id, user_id, syllabus_id, filename, chunks_indexed)
     VALUES (?, ?, ?, ?, ?)`,
    [input.id, input.userId, input.syllabusId, input.filename, input.chunksIndexed],
  );
}

/** Newest first — for listing what a student has already uploaded for a syllabus. */
export async function getReferenceMaterials(syllabusId: string): Promise<ReferenceMaterial[]> {
  await initDb();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, filename, chunks_indexed, created_at FROM reference_materials
     WHERE syllabus_id = ? ORDER BY created_at DESC`,
    [syllabusId],
  );
  return rows as ReferenceMaterial[];
}

export interface RevisionItem {
  topic_id: string;
  topic_name: string;
  subject: string;
  next_review_date: string;
  overdue: boolean;
}

/** Topics due for revision within the next 7 days (including overdue ones), soonest first, scoped to one syllabus. */
export async function getUpcomingRevisions(userId: string, syllabusId: string): Promise<RevisionItem[]> {
  await initDb();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT topic_id, topic_name, subject, next_review_date
     FROM revision_schedule
     WHERE user_id = ? AND syllabus_id = ? AND next_review_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
     ORDER BY next_review_date ASC`,
    [userId, syllabusId],
  );
  const today = todayStr();
  return (rows as Array<{ topic_id: string; topic_name: string; subject: string; next_review_date: string }>).map(
    (r) => {
      const dateStr = typeof r.next_review_date === "string" ? r.next_review_date : new Date(r.next_review_date).toISOString().slice(0, 10);
      return { ...r, next_review_date: dateStr, overdue: dateStr < today };
    },
  );
}
