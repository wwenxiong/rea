const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'app.db'));

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT    NOT NULL UNIQUE,
    password     TEXT    NOT NULL,
    role         TEXT    NOT NULL DEFAULT 'user',
    is_active    INTEGER NOT NULL DEFAULT 0,
    activated_at INTEGER,
    created_at   INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS coursewares (
    id          TEXT    NOT NULL,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT    NOT NULL,
    updated_at  INTEGER NOT NULL,
    deleted     INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (id, user_id)
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    ai_config  TEXT    NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS license_keys (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    code       TEXT    NOT NULL UNIQUE,
    status     TEXT    NOT NULL DEFAULT 'unused',
    used_by    INTEGER REFERENCES users(id),
    created_at INTEGER NOT NULL,
    used_at    INTEGER
  );

  CREATE TABLE IF NOT EXISTS user_monthly_usage (
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month        TEXT    NOT NULL,
    import_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, month)
  );
`);


// 确保已存在旧表时平滑迁移新增列
const userColumns = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userColumns.includes('role')) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
}
if (!userColumns.includes('is_active')) {
  db.exec("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 0");
}
if (!userColumns.includes('activated_at')) {
  db.exec("ALTER TABLE users ADD COLUMN activated_at INTEGER");
}

// 自动初始化超级管理员账号
function initAdminUser() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin888888';

  const existing = db.prepare('SELECT id, role, is_active FROM users WHERE username = ?').get(adminUsername);
  if (!existing) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    db.prepare(`
      INSERT INTO users (username, password, role, is_active, activated_at, created_at)
      VALUES (?, ?, 'admin', 1, ?, ?)
    `).run(adminUsername, hash, Date.now(), Date.now());
    console.log(`[db] 超级管理员已创建: 用户名=${adminUsername}`);
  } else {
    // 确保超级管理员角色和激活状态始终有效
    if (existing.role !== 'admin' || existing.is_active !== 1) {
      db.prepare("UPDATE users SET role = 'admin', is_active = 1 WHERE id = ?").run(existing.id);
    }
  }
}

initAdminUser();

module.exports = db;
