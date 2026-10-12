const express = require('express');
const crypto = require('crypto');
const db = require('./db');
const { requireAuth, requireAdmin } = require('./auth');

const router = express.Router();

// 全部接口要求管理员权限
router.use(requireAuth, requireAdmin);

// 生成易读授权码，格式 REA-XXXX-XXXX-XXXX
function generateLicenseCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 剔除易混淆的 0,1,O,I
  function getRandomPart(len) {
    let part = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      part += chars[bytes[i] % chars.length];
    }
    return part;
  }
  return `REA-${getRandomPart(4)}-${getRandomPart(4)}-${getRandomPart(4)}`;
}

// 1. 获取所有用户列表
router.get('/users', (req, res) => {
  const d = new Date();
  const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  const users = db.prepare(`
    SELECT 
      u.id, 
      u.username, 
      u.role, 
      u.is_active, 
      u.created_at, 
      u.activated_at,
      (SELECT COUNT(*) FROM coursewares c WHERE c.user_id = u.id AND c.deleted = 0) AS courseware_count,
      COALESCE((SELECT import_count FROM user_monthly_usage m WHERE m.user_id = u.id AND m.month = ?), 0) AS monthly_imports
    FROM users u
    ORDER BY u.id ASC
  `).all(currentMonth);

  res.json({ users, currentMonth });
});


// 2. 切换指定用户激活状态
router.post('/users/:id/toggle-active', (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) return res.status(400).json({ error: '无效用户ID' });

  const target = db.prepare('SELECT id, username, role, is_active FROM users WHERE id = ?').get(targetId);
  if (!target) return res.status(404).json({ error: '用户不存在' });

  if (target.role === 'admin') {
    return res.status(400).json({ error: '超级管理员账号不可修改激活状态' });
  }

  const nextActive = target.is_active === 1 ? 0 : 1;
  const activatedAt = nextActive === 1 ? Date.now() : null;

  db.prepare('UPDATE users SET is_active = ?, activated_at = ? WHERE id = ?')
    .run(nextActive, activatedAt, targetId);

  res.json({ ok: true, is_active: nextActive });
});

// 3. 获取所有授权码列表
router.get('/licenses', (req, res) => {
  const licenses = db.prepare(`
    SELECT 
      l.id, 
      l.code, 
      l.status, 
      l.created_at, 
      l.used_at, 
      u.username AS used_by_username
    FROM license_keys l
    LEFT JOIN users u ON l.used_by = u.id
    ORDER BY l.id DESC
  `).all();

  res.json({ licenses });
});

// 4. 批量生成授权码
router.post('/licenses/generate', (req, res) => {
  const count = Math.min(100, Math.max(1, parseInt(req.body.count, 10) || 1));
  const insertStmt = db.prepare('INSERT INTO license_keys (code, status, created_at) VALUES (?, ?, ?)');

  const generatedCodes = [];
  const now = Date.now();

  const insertTx = db.transaction(() => {
    for (let i = 0; i < count; i++) {
      let code;
      let inserted = false;
      // 循环确保唯一性
      while (!inserted) {
        try {
          code = generateLicenseCode();
          insertStmt.run(code, 'unused', now);
          inserted = true;
          generatedCodes.push(code);
        } catch (e) {
          // 主键冲突时重试
          if (!e.message.includes('UNIQUE')) throw e;
        }
      }
    }
  });

  try {
    insertTx();
    res.json({ ok: true, count, codes: generatedCodes });
  } catch (err) {
    res.status(500).json({ error: '生成授权码失败: ' + err.message });
  }
});

// 5. 作废/删除未使用的授权码
router.delete('/licenses/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: '无效授权码ID' });

  const license = db.prepare('SELECT id, status FROM license_keys WHERE id = ?').get(id);
  if (!license) return res.status(404).json({ error: '授权码不存在' });

  db.prepare('DELETE FROM license_keys WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
