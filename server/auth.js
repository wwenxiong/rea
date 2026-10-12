const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'rea-secret-jwt-key-2026';
const TOKEN_EXPIRES = '30d';

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, is_active: user.is_active },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES }
  );
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: '用户名和密码不能为空' });
  if (username.length < 2 || username.length > 30)
    return res.status(400).json({ error: '用户名长度 2-30 位' });
  if (password.length < 6)
    return res.status(400).json({ error: '密码至少 6 位' });

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) return res.status(409).json({ error: '用户名已存在' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    "INSERT INTO users (username, password, role, is_active, created_at) VALUES (?, ?, 'user', 0, ?)"
  ).run(username, hash, Date.now());

  const user = {
    id: result.lastInsertRowid,
    username,
    role: 'user',
    is_active: 0,
  };

  const token = signToken(user);
  res.json({ token, user });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: '用户名和密码不能为空' });

  const user = db.prepare('SELECT id, username, password, role, is_active FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: '用户名或密码错误' });

  const safeUser = {
    id: user.id,
    username: user.username,
    role: user.role,
    is_active: Number(user.is_active),
  };

  const token = signToken(safeUser);
  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/activate  用户核销授权码激活
router.post('/activate', requireAuth, (req, res) => {
  const rawCode = (req.body.code || '').trim().toUpperCase();
  if (!rawCode) {
    return res.status(400).json({ error: '请输入授权码' });
  }

  const license = db.prepare('SELECT * FROM license_keys WHERE UPPER(code) = ?').get(rawCode);
  if (!license) {
    return res.status(400).json({ error: '授权码无效，请检查是否输入正确' });
  }
  if (license.status !== 'unused') {
    return res.status(400).json({ error: '该授权码已被使用或已作废' });
  }

  const now = Date.now();
  const activateTx = db.transaction(() => {
    db.prepare("UPDATE license_keys SET status = 'used', used_by = ?, used_at = ? WHERE id = ?")
      .run(req.user.id, now, license.id);
    db.prepare("UPDATE users SET is_active = 1, activated_at = ? WHERE id = ?")
      .run(now, req.user.id);
  });

  try {
    activateTx();
    const updatedUser = db.prepare('SELECT id, username, role, is_active FROM users WHERE id = ?').get(req.user.id);
    const safeUser = {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      is_active: Number(updatedUser.is_active),
    };
    const newToken = signToken(safeUser);
    res.json({ ok: true, user: safeUser, token: newToken });
  } catch (err) {
    res.status(500).json({ error: '激活失败: ' + err.message });
  }
});

const MONTHLY_FREE_IMPORT_LIMIT = 5;

function getMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// GET /api/auth/quota  查询当前用户当月上传额度
router.get('/quota', requireAuth, (req, res) => {
  const isUnlimited = req.user.role === 'admin' || req.user.is_active === 1;
  const currentMonth = getMonthStr();

  const record = db.prepare('SELECT import_count FROM user_monthly_usage WHERE user_id = ? AND month = ?')
    .get(req.user.id, currentMonth);
  const used = record ? record.import_count : 0;
  const remaining = isUnlimited ? 999999 : Math.max(0, MONTHLY_FREE_IMPORT_LIMIT - used);

  res.json({
    is_active: req.user.is_active === 1,
    is_admin: req.user.role === 'admin',
    is_unlimited: isUnlimited,
    limit: isUnlimited ? 999999 : MONTHLY_FREE_IMPORT_LIMIT,
    used,
    remaining,
    month: currentMonth,
  });
});

// POST /api/auth/consume-import  导入/上传成功后扣减 1 次额度
router.post('/consume-import', requireAuth, (req, res) => {
  const isUnlimited = req.user.role === 'admin' || req.user.is_active === 1;
  const currentMonth = getMonthStr();

  const record = db.prepare('SELECT import_count FROM user_monthly_usage WHERE user_id = ? AND month = ?')
    .get(req.user.id, currentMonth);
  const used = record ? record.import_count : 0;

  if (!isUnlimited && used >= MONTHLY_FREE_IMPORT_LIMIT) {
    return res.status(403).json({
      error: `您本月免费导入试卷额度（${MONTHLY_FREE_IMPORT_LIMIT}篇）已用尽，请输入授权码激活系统以解锁无限使用。`,
      quotaExceeded: true,
    });
  }

  // 记录消费
  db.prepare(`
    INSERT INTO user_monthly_usage (user_id, month, import_count)
    VALUES (?, ?, 1)
    ON CONFLICT(user_id, month) DO UPDATE SET
      import_count = import_count + 1
  `).run(req.user.id, currentMonth);

  const updatedRecord = db.prepare('SELECT import_count FROM user_monthly_usage WHERE user_id = ? AND month = ?')
    .get(req.user.id, currentMonth);
  const newUsed = updatedRecord ? updatedRecord.import_count : used + 1;
  const remaining = isUnlimited ? 999999 : Math.max(0, MONTHLY_FREE_IMPORT_LIMIT - newUsed);

  res.json({
    ok: true,
    is_unlimited: isUnlimited,
    used: newUsed,
    remaining,
    month: currentMonth,
  });
});

// JWT 鉴权中间件 (从数据库读取最新状态)
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: '未登录' });
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const dbUser = db.prepare('SELECT id, username, role, is_active FROM users WHERE id = ?').get(payload.id);
    if (!dbUser) return res.status(401).json({ error: '用户不存在' });

    req.user = {
      id: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
      is_active: Number(dbUser.is_active),
    };
    next();
  } catch {
    res.status(401).json({ error: 'Token 无效或已过期' });
  }
}

// 检查是否已激活
function requireActive(req, res, next) {
  if (!req.user) return res.status(401).json({ error: '未登录' });
  if (req.user.role === 'admin' || req.user.is_active === 1) {
    return next();
  }
  return res.status(403).json({ error: '账号未激活，请输入授权码激活系统使用权限', needActivation: true });
}

// 管理员专用中间件
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: '未登录' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: '无权访问：需要超级管理员权限' });
  }
  next();
}

module.exports = { router, requireAuth, requireActive, requireAdmin, MONTHLY_FREE_IMPORT_LIMIT };

