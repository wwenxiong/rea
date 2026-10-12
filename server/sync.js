const express = require('express');
const db = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();

// 所有路由都需要登录
router.use(requireAuth);



const { sampleCourseware, sampleClozeCourseware, sampleWordBankCourseware } = require('./sampleData');

// GET /api/sync/coursewares  拉取当前用户的全部课件
router.get('/coursewares', (req, res) => {
  let rows = db.prepare(
    'SELECT id, content, updated_at FROM coursewares WHERE user_id = ? AND deleted = 0 ORDER BY updated_at DESC'
  ).all(req.user.id);

  // 如果该用户在云端还没有任何课件记录（包括新注册用户），为其独立初始化专属的 3 套预设示例课件
  if (rows.length === 0) {
    const hasAny = db.prepare('SELECT 1 FROM coursewares WHERE user_id = ? LIMIT 1').get(req.user.id);
    if (!hasAny) {
      const insertStmt = db.prepare(`
        INSERT INTO coursewares (id, user_id, content, updated_at, deleted)
        VALUES (?, ?, ?, ?, 0)
      `);
      const now = Date.now();
      const samples = [sampleCourseware, sampleWordBankCourseware, sampleClozeCourseware];
      const txn = db.transaction(() => {
        samples.forEach((sample, idx) => {
          insertStmt.run(sample.id, req.user.id, JSON.stringify(sample), now - (idx * 1000));
        });
      });
      txn();

      rows = db.prepare(
        'SELECT id, content, updated_at FROM coursewares WHERE user_id = ? AND deleted = 0 ORDER BY updated_at DESC'
      ).all(req.user.id);
    }
  }

  const list = rows.map(r => {
    try { return JSON.parse(r.content); }
    catch { return null; }
  }).filter(Boolean);

  res.json({ coursewares: list });
});

// POST /api/sync/coursewares  批量上传/更新课件
// body: { coursewares: Courseware[] }
router.post('/coursewares', (req, res) => {
  const { coursewares } = req.body;
  if (!Array.isArray(coursewares))
    return res.status(400).json({ error: 'coursewares 必须是数组' });

  const upsert = db.prepare(`
    INSERT INTO coursewares (id, user_id, content, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id, user_id) DO UPDATE SET
      content    = excluded.content,
      updated_at = excluded.updated_at,
      deleted    = 0
    WHERE excluded.updated_at > coursewares.updated_at
  `);

  const txn = db.transaction((list) => {
    for (const cw of list) {
      if (!cw || !cw.id) continue;
      upsert.run(cw.id, req.user.id, JSON.stringify(cw), cw.updatedAt || Date.now());
    }
  });

  txn(coursewares);
  res.json({ ok: true });
});

// DELETE /api/sync/coursewares/:id  软删除一个课件
router.delete('/coursewares/:id', (req, res) => {
  db.prepare(
    'UPDATE coursewares SET deleted = 1, updated_at = ? WHERE id = ? AND user_id = ?'
  ).run(Date.now(), req.params.id, req.user.id);
  res.json({ ok: true });
});

// GET /api/sync/settings  拉取用户 AI 配置
router.get('/settings', (req, res) => {
  const row = db.prepare('SELECT ai_config FROM user_settings WHERE user_id = ?').get(req.user.id);
  try {
    res.json({ aiConfig: row ? JSON.parse(row.ai_config) : {} });
  } catch {
    res.json({ aiConfig: {} });
  }
});

// PUT /api/sync/settings  保存用户 AI 配置
// body: { aiConfig: object }
router.put('/settings', (req, res) => {
  const { aiConfig } = req.body;
  if (!aiConfig) return res.status(400).json({ error: '缺少 aiConfig' });

  db.prepare(`
    INSERT INTO user_settings (user_id, ai_config, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      ai_config  = excluded.ai_config,
      updated_at = excluded.updated_at
  `).run(req.user.id, JSON.stringify(aiConfig), Date.now());

  res.json({ ok: true });
});

module.exports = router;
