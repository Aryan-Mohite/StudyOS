-- StudyOS — MySQL Schema
-- mysql -u root -p studyos < schema.sql

CREATE DATABASE IF NOT EXISTS studyos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE studyos;

CREATE TABLE IF NOT EXISTS users (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clerk_id     VARCHAR(128) NOT NULL UNIQUE,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  university   VARCHAR(150),
  branch       VARCHAR(100),
  semester     TINYINT UNSIGNED,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_clerk (clerk_id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject_name VARCHAR(200) NOT NULL,
  semester     TINYINT UNSIGNED,
  branch       VARCHAR(100),
  university   VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS syllabi (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject_id   INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  pdf_url      TEXT,
  parsed_at    TIMESTAMP NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  INDEX idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS topics (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  syllabus_id  INT UNSIGNED NOT NULL,
  unit_number  TINYINT UNSIGNED,
  topic        VARCHAR(200) NOT NULL,
  subtopic     VARCHAR(200),
  difficulty   ENUM('easy','medium','hard') DEFAULT 'medium',
  FOREIGN KEY (syllabus_id) REFERENCES syllabi(id) ON DELETE CASCADE,
  INDEX idx_syllabus (syllabus_id)
);

CREATE TABLE IF NOT EXISTS books (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(300) NOT NULL,
  author       VARCHAR(200),
  pdf_url      TEXT,
  uploaded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  topic_id     INT UNSIGNED NOT NULL,
  note_type    ENUM('long','short','revision') DEFAULT 'long',
  content      LONGTEXT NOT NULL,
  model_used   VARCHAR(50),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  INDEX idx_topic (topic_id)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  topic_id     INT UNSIGNED NOT NULL,
  quiz_type    ENUM('mcq','viva','interview') DEFAULT 'mcq',
  questions    JSON NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS progress (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  topic_id     INT UNSIGNED NOT NULL,
  completed    BOOLEAN DEFAULT FALSE,
  score        TINYINT UNSIGNED,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_topic (user_id, topic_id)
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  syllabus_id  INT UNSIGNED NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (syllabus_id) REFERENCES syllabi(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id   INT UNSIGNED NOT NULL,
  role         ENUM('user','assistant') NOT NULL,
  content      TEXT NOT NULL,
  model_used   VARCHAR(50),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  INDEX idx_session (session_id)
);
