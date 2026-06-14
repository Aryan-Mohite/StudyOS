-- ─────────────────────────────────────────────────────────────────────────────
-- StudyOS — MySQL Schema
-- Run: mysql -u root -p studyos < schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS studyos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE studyos;

-- ── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)    NOT NULL,
    email         VARCHAR(255)    NOT NULL UNIQUE,
    password_hash VARCHAR(255)    NOT NULL,
    university    VARCHAR(150),
    branch        VARCHAR(100),
    semester      TINYINT UNSIGNED,
    created_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── Subjects ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
    id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    subject_name  VARCHAR(200)    NOT NULL,
    semester      TINYINT UNSIGNED,
    branch        VARCHAR(100),
    university    VARCHAR(150)
);

-- ── Syllabi ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS syllabi (
    id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    subject_id    INT UNSIGNED    NOT NULL,
    user_id       INT UNSIGNED    NOT NULL,
    pdf_url       TEXT,
    parsed_at     TIMESTAMP,
    created_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
);

-- ── Topics ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topics (
    id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    syllabus_id   INT UNSIGNED    NOT NULL,
    unit_number   TINYINT UNSIGNED,
    topic         VARCHAR(200)    NOT NULL,
    subtopic      VARCHAR(200),
    difficulty    ENUM('easy','medium','hard') DEFAULT 'medium',
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(id) ON DELETE CASCADE
);

-- ── Books ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
    id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(300)    NOT NULL,
    author        VARCHAR(200),
    pdf_url       TEXT,
    uploaded_at   TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

-- ── Notes ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notes (
    id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    topic_id      INT UNSIGNED    NOT NULL,
    note_type     ENUM('long','short','revision') DEFAULT 'long',
    content       LONGTEXT        NOT NULL,
    generated_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

-- ── Chat Sessions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
    id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED    NOT NULL,
    syllabus_id   INT UNSIGNED    NOT NULL,
    created_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)     REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (syllabus_id) REFERENCES syllabi(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    session_id    INT UNSIGNED    NOT NULL,
    role          ENUM('user','assistant') NOT NULL,
    content       TEXT            NOT NULL,
    created_at    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_topics_syllabus  ON topics(syllabus_id);
CREATE INDEX idx_notes_topic      ON notes(topic_id);
CREATE INDEX idx_chat_session     ON chat_messages(session_id);
CREATE INDEX idx_syllabi_user     ON syllabi(user_id);
