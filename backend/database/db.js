// ══════════════════════════════════════════════
//  database/db.js — sql.js (pure JS SQLite)
//  No C++ needed — works on any Windows PC!
// ══════════════════════════════════════════════

const initSqlJs = require('sql.js');
const path      = require('path');
const fs        = require('fs');

const DB_PATH = path.join(__dirname, 'careeros.db');
let _db = null;

function saveDB() {
  if (!_db) return;
  try {
    const data = _db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch(e) { console.error('DB save error:', e.message); }
}

setInterval(saveDB, 30000);
process.on('exit', saveDB);
process.on('SIGINT', () => { saveDB(); process.exit(0); });
process.on('SIGTERM', () => { saveDB(); process.exit(0); });

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
    console.log('✅ Database loaded from disk');
  } else {
    _db = new SQL.Database();
    console.log('✅ New database created');
  }
  createTables();
  saveDB();
}

function createTables() {
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT UNIQUE NOT NULL,
      email      TEXT UNIQUE,
      full_name  TEXT,
      password   TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS resumes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL,
      filename      TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_text     TEXT NOT NULL,
      word_count    INTEGER,
      ats_score     INTEGER,
      uploaded_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS resume_analyses (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id           INTEGER NOT NULL,
      resume_id         INTEGER NOT NULL,
      ats_score         INTEGER,
      format_score      INTEGER,
      keyword_score     INTEGER,
      experience_score  INTEGER,
      achievement_score INTEGER,
      education_score   INTEGER,
      found_keywords    TEXT,
      missing_keywords  TEXT,
      feedback          TEXT,
      skills_count      INTEGER,
      analyzed_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS jd_matches (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL,
      resume_id       INTEGER,
      jd_text         TEXT NOT NULL,
      match_score     INTEGER,
      match_level     TEXT,
      matching_skills TEXT,
      missing_skills  TEXT,
      tailoring_tips  TEXT,
      summary         TEXT,
      cover_letter    TEXT,
      matched_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS interview_sessions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL,
      role           TEXT NOT NULL,
      interview_type TEXT NOT NULL,
      final_score    INTEGER,
      completed      INTEGER DEFAULT 0,
      started_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at   DATETIME
    );
    CREATE TABLE IF NOT EXISTS interview_qa (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id   INTEGER NOT NULL,
      question_num INTEGER,
      question     TEXT NOT NULL,
      answer       TEXT,
      score        INTEGER,
      verdict      TEXT,
      feedback     TEXT,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS skill_gaps (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id           INTEGER NOT NULL,
      resume_id         INTEGER,
      target_role       TEXT NOT NULL,
      overall_readiness INTEGER,
      summary           TEXT,
      skills_data       TEXT,
      strengths         TEXT,
      critical_gaps     TEXT,
      analyzed_at       DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS roadmaps (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL,
      target_role   TEXT NOT NULL,
      timeline      TEXT NOT NULL,
      steps_data    TEXT,
      key_milestone TEXT,
      first_action  TEXT,
      generated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// ── db object that mimics better-sqlite3 API ──
// Usage: db.prepare('SELECT...').get(params)
//        db.prepare('INSERT...').run(params)
//        db.prepare('SELECT...').all(params)

const db = {
  prepare(sql) {
    return {
      get(...params) {
        const flat = params.flat();
        const stmt = _db.prepare(sql);
        stmt.bind(flat);
        const row = stmt.step() ? stmt.getAsObject() : undefined;
        stmt.free();
        return row;
      },
      all(...params) {
        const flat = params.flat();
        const stmt = _db.prepare(sql);
        stmt.bind(flat);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
      run(...params) {
        const flat = params.flat();
        _db.run(sql, flat);
        const res = _db.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid = res[0]?.values[0][0] || 0;
        saveDB();
        return { lastInsertRowid };
      }
    };
  },
  exec(sql) {
    return _db.exec(sql);
  },
  run(sql, params = []) {
    _db.run(sql, params);
    saveDB();
  }
};

module.exports = { initDB, db };
