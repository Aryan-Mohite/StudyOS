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

-- ── Personalized Learning ──────────────────────────────────────────────────
-- Every graded interaction (an answered MCQ, or a self-marked numerical)
-- lands here first. topic_mastery and revision_schedule are rollups kept in
-- sync on write, so reads (dashboard, progress page) never have to scan
-- raw attempts. This mirrors the cache-first pattern used everywhere else:
-- write once, read the rollup.

CREATE TABLE IF NOT EXISTS attempts (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       VARCHAR(128) NOT NULL,
  syllabus_id   VARCHAR(64),
  topic_id      VARCHAR(128) NOT NULL,
  topic_name    VARCHAR(512) NOT NULL,
  subject       VARCHAR(256) NOT NULL,
  content_type  VARCHAR(16) NOT NULL,      -- 'mcq' | 'numerical'
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

CREATE TABLE IF NOT EXISTS daily_goals (
  user_id              VARCHAR(128) NOT NULL,
  goal_date             DATE NOT NULL,
  target_questions      INT NOT NULL DEFAULT 10,
  completed_questions   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, goal_date)
);

CREATE TABLE IF NOT EXISTS weekly_goals (
  user_id            VARCHAR(128) NOT NULL,
  week_start         DATE NOT NULL,       -- Monday of the target week
  target_topics      INT NOT NULL DEFAULT 5,
  completed_topics    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, week_start)
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
  syllabusId?: string | null;
  topicId: string;
  topicName: string;
  subject: string;
  contentType: "mcq" | "numerical";
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
export async function recordAttempt(input: RecordAttemptInput): Promise<AttemptRollup> {
  await initDb();
  const pool = getPool();
  const { userId, syllabusId, topicId, topicName, subject, contentType, difficulty, isCorrect } = input;
  const correctInt = isCorrect ? 1 : 0;

  await pool.query(
    `INSERT INTO attempts (user_id, syllabus_id, topic_id, topic_name, subject, content_type, difficulty, is_correct)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, syllabusId ?? null, topicId, topicName, subject, contentType, difficulty, correctInt],
  );

  await pool.query(
    `INSERT INTO topic_mastery (user_id, topic_id, topic_name, subject, syllabus_id, total_attempts, correct_attempts, mastery_score, last_attempted_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       total_attempts = total_attempts + 1,
       correct_attempts = correct_attempts + VALUES(correct_attempts),
       mastery_score = ROUND(100 * (correct_attempts + VALUES(correct_attempts)) / (total_attempts + 1), 2),
       last_attempted_at = NOW()`,
    [userId, topicId, topicName, subject, syllabusId ?? null, correctInt, isCorrect ? 100 : 0],
  );

  const [masteryRows] = await pool.query(
    `SELECT mastery_score, total_attempts, correct_attempts FROM topic_mastery WHERE user_id = ? AND topic_id = ?`,
    [userId, topicId],
  );
  const mastery = (masteryRows as Array<{ mastery_score: string; total_attempts: number; correct_attempts: number }>)[0];

  // Simplified SM-2-style spacing: correct doubles the interval (capped),
  // incorrect resets it to 1 day so the topic resurfaces almost immediately.
  const [revRows] = await pool.query(
    `SELECT interval_days FROM revision_schedule WHERE user_id = ? AND topic_id = ?`,
    [userId, topicId],
  );
  const prevInterval = (revRows as Array<{ interval_days: number }>)[0]?.interval_days ?? 0;
  const nextInterval = isCorrect ? Math.min(prevInterval > 0 ? prevInterval * 2 : 2, 30) : 1;
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);
  const nextReviewStr = nextReviewDate.toISOString().slice(0, 10);

  await pool.query(
    `INSERT INTO revision_schedule (user_id, topic_id, topic_name, subject, syllabus_id, interval_days, next_review_date, last_reviewed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       interval_days = VALUES(interval_days),
       next_review_date = VALUES(next_review_date),
       last_reviewed_at = NOW()`,
    [userId, topicId, topicName, subject, syllabusId ?? null, nextInterval, nextReviewStr],
  );

  await pool.query(
    `INSERT INTO daily_goals (user_id, goal_date, completed_questions)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE completed_questions = completed_questions + 1`,
    [userId, todayStr()],
  );

  return {
    mastery_score: Number(mastery?.mastery_score ?? (isCorrect ? 100 : 0)),
    total_attempts: mastery?.total_attempts ?? 1,
    correct_attempts: mastery?.correct_attempts ?? correctInt,
    next_review_date: nextReviewStr,
  };
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

export async function getOrCreateDailyGoal(userId: string): Promise<DailyGoal> {
  await initDb();
  const pool = getPool();
  const date = todayStr();
  await pool.query(
    `INSERT IGNORE INTO daily_goals (user_id, goal_date) VALUES (?, ?)`,
    [userId, date],
  );
  const [rows] = await pool.query(
    `SELECT goal_date, target_questions, completed_questions FROM daily_goals WHERE user_id = ? AND goal_date = ?`,
    [userId, date],
  );
  const row = (rows as Array<{ goal_date: string; target_questions: number; completed_questions: number }>)[0];
  return {
    goal_date: date,
    target_questions: row?.target_questions ?? 10,
    completed_questions: row?.completed_questions ?? 0,
  };
}

export async function setDailyGoalTarget(userId: string, targetQuestions: number): Promise<DailyGoal> {
  await initDb();
  const pool = getPool();
  const date = todayStr();
  await pool.query(
    `INSERT INTO daily_goals (user_id, goal_date, target_questions)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE target_questions = VALUES(target_questions)`,
    [userId, date, targetQuestions],
  );
  return getOrCreateDailyGoal(userId);
}

export interface WeeklyGoal {
  week_start: string;
  target_topics: number;
  completed_topics: number;
}

export async function getOrCreateWeeklyGoal(userId: string): Promise<WeeklyGoal> {
  await initDb();
  const pool = getPool();
  const weekStart = weekStartStr();
  await pool.query(
    `INSERT IGNORE INTO weekly_goals (user_id, week_start) VALUES (?, ?)`,
    [userId, weekStart],
  );
  // Distinct topics attempted this week — computed from attempts rather than
  // tracked incrementally, since "distinct" can't be done with a simple counter.
  const [countRows] = await pool.query(
    `SELECT COUNT(DISTINCT topic_id) AS c FROM attempts WHERE user_id = ? AND created_at >= ?`,
    [userId, weekStart],
  );
  const completed = (countRows as Array<{ c: number }>)[0]?.c ?? 0;

  const [rows] = await pool.query(
    `SELECT week_start, target_topics FROM weekly_goals WHERE user_id = ? AND week_start = ?`,
    [userId, weekStart],
  );
  const row = (rows as Array<{ week_start: string; target_topics: number }>)[0];
  return {
    week_start: weekStart,
    target_topics: row?.target_topics ?? 5,
    completed_topics: completed,
  };
}

export async function setWeeklyGoalTarget(userId: string, targetTopics: number): Promise<WeeklyGoal> {
  await initDb();
  const pool = getPool();
  const weekStart = weekStartStr();
  await pool.query(
    `INSERT INTO weekly_goals (user_id, week_start, target_topics)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE target_topics = VALUES(target_topics)`,
    [userId, weekStart, targetTopics],
  );
  return getOrCreateWeeklyGoal(userId);
}

/** Consecutive days (ending today or yesterday) with at least one completed question. */
export async function getStreakDays(userId: string): Promise<number> {
  await initDb();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT goal_date FROM daily_goals
     WHERE user_id = ? AND completed_questions > 0
     ORDER BY goal_date DESC LIMIT 60`,
    [userId],
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

/** Weakest topics first (lowest mastery), so both the dashboard and /progress can slice off the top N. */
export async function getTopicMastery(userId: string): Promise<TopicMasteryRow[]> {
  await initDb();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT topic_id, topic_name, subject, total_attempts, correct_attempts, mastery_score, last_attempted_at
     FROM topic_mastery WHERE user_id = ? ORDER BY mastery_score ASC, total_attempts DESC`,
    [userId],
  );
  return (rows as Array<TopicMasteryRow & { mastery_score: string }>).map((r) => ({
    ...r,
    mastery_score: Number(r.mastery_score),
  }));
}

export interface RevisionItem {
  topic_id: string;
  topic_name: string;
  subject: string;
  next_review_date: string;
  overdue: boolean;
}

/** Topics due for revision within the next 7 days (including overdue ones), soonest first. */
export async function getUpcomingRevisions(userId: string): Promise<RevisionItem[]> {
  await initDb();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT topic_id, topic_name, subject, next_review_date
     FROM revision_schedule
     WHERE user_id = ? AND next_review_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
     ORDER BY next_review_date ASC`,
    [userId],
  );
  const today = todayStr();
  return (rows as Array<{ topic_id: string; topic_name: string; subject: string; next_review_date: string }>).map(
    (r) => {
      const dateStr = typeof r.next_review_date === "string" ? r.next_review_date : new Date(r.next_review_date).toISOString().slice(0, 10);
      return { ...r, next_review_date: dateStr, overdue: dateStr < today };
    },
  );
}
