import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { authRequired } from '../middleware/auth.js';
import {
  parseTechInput,
  parseCategories,
  loadProjectFull,
  validateForPublish,
  serializeCategories
} from '../utils/project.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { account, password } = req.body;
    if (!account || !password) {
      return res.status(400).json({ message: '请输入账号和密码' });
    }
    const [rows] = await pool.query(
      'SELECT * FROM admin_user WHERE account = ? AND status = 1',
      [account]
    );
    if (!rows.length) return res.status(401).json({ message: '账号或密码错误' });
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ message: '账号或密码错误' });
    const token = jwt.sign({ id: rows[0].id, account }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, account });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '登录失败' });
  }
});

router.get('/dashboard', authRequired, async (_req, res) => {
  try {
    const [[stats]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM project WHERE deleted_at IS NULL) AS total,
        (SELECT COUNT(*) FROM project WHERE status = 'published' AND deleted_at IS NULL) AS published,
        (SELECT COUNT(*) FROM project WHERE status = 'draft' AND deleted_at IS NULL) AS draft,
        (SELECT COUNT(*) FROM project_media) AS media_count
    `);
    const [recent] = await pool.query(`
      SELECT id, name, status, updated_at FROM project
      WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 5
    `);
    res.json({ stats, recent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '获取概览失败' });
  }
});

router.get('/projects', authRequired, async (req, res) => {
  try {
    const { keyword = '', status = 'all' } = req.query;
    let sql = `
      SELECT p.*,
        (SELECT COUNT(*) FROM project_feature pf WHERE pf.project_id = p.id) AS feature_count,
        (SELECT GROUP_CONCAT(pt.tech_name ORDER BY pt.sort_order SEPARATOR '、') FROM project_tech pt WHERE pt.project_id = p.id) AS techs_text
      FROM project p WHERE p.deleted_at IS NULL
    `;
    const params = [];
    if (status === 'published' || status === 'draft') {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (keyword.trim()) {
      sql += ` AND (p.name LIKE ? OR EXISTS (
        SELECT 1 FROM project_tech pt WHERE pt.project_id = p.id AND pt.tech_name LIKE ?
      ))`;
      const kw = `%${keyword.trim()}%`;
      params.push(kw, kw);
    }
    sql += ' ORDER BY p.updated_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows.map((row) => ({
      ...row,
      categories: parseCategories(row.category)
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '获取项目列表失败' });
  }
});

router.get('/projects/:id', authRequired, async (req, res) => {
  try {
    const project = await loadProjectFull(req.params.id);
    if (!project) return res.status(404).json({ message: '项目不存在' });
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '获取项目详情失败' });
  }
});

router.post('/projects', authRequired, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const body = req.body;
    const techs = parseTechInput(body.techs || body.tech_input);
    const summary = (body.summary || body.description || '').slice(0, 100);

    const [result] = await conn.query(
      `INSERT INTO project (name, category, level, summary, description, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        body.name || '未命名项目',
        serializeCategories(body.categories || body.category),
        body.level || '入门',
        summary,
        body.description || '',
        body.status === 'published' ? 'published' : 'draft',
        Number(body.sort_order) || 0
      ]
    );
    const projectId = result.insertId;

    for (let i = 0; i < techs.length; i++) {
      await conn.query(
        'INSERT INTO project_tech (project_id, tech_name, sort_order) VALUES (?, ?, ?)',
        [projectId, techs[i], i]
      );
    }

    if (Array.isArray(body.features)) {
      for (let i = 0; i < body.features.length; i++) {
        const f = body.features[i];
        await conn.query(
          `INSERT INTO project_feature (project_id, name, description, steps, sort_order) VALUES (?, ?, ?, ?, ?)`,
          [projectId, f.name || '', f.description || '', f.steps || '', i]
        );
      }
    }

    await conn.commit();
    const project = await loadProjectFull(projectId);
    res.status(201).json(project);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: '创建项目失败' });
  } finally {
    conn.release();
  }
});

router.put('/projects/:id', authRequired, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const id = req.params.id;
    const body = req.body;
    const [exists] = await conn.query('SELECT id FROM project WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!exists.length) return res.status(404).json({ message: '项目不存在' });

    const techs = parseTechInput(body.techs || body.tech_input);
    const summary = (body.summary || body.description || '').slice(0, 100);

    await conn.beginTransaction();
    await conn.query(
      `UPDATE project SET name=?, category=?, level=?, summary=?, description=?, status=?, sort_order=?, updated_at=NOW()
       WHERE id=?`,
      [
        body.name,
        serializeCategories(body.categories || body.category),
        body.level || '入门',
        summary,
        body.description,
        body.status === 'published' ? 'published' : 'draft',
        Number(body.sort_order) || 0,
        id
      ]
    );

    await conn.query('DELETE FROM project_tech WHERE project_id = ?', [id]);
    for (let i = 0; i < techs.length; i++) {
      await conn.query(
        'INSERT INTO project_tech (project_id, tech_name, sort_order) VALUES (?, ?, ?)',
        [id, techs[i], i]
      );
    }

    if (Array.isArray(body.features)) {
      const [oldFeatures] = await conn.query('SELECT id FROM project_feature WHERE project_id = ?', [id]);
      const keepIds = body.features.filter((f) => f.id).map((f) => f.id);
      for (const old of oldFeatures) {
        if (!keepIds.includes(old.id)) {
          await conn.query('DELETE FROM feature_image WHERE feature_id = ?', [old.id]);
          await conn.query('DELETE FROM project_feature WHERE id = ?', [old.id]);
        }
      }

      for (let i = 0; i < body.features.length; i++) {
        const f = body.features[i];
        if (f.id) {
          await conn.query(
            `UPDATE project_feature SET name=?, description=?, steps=?, sort_order=? WHERE id=? AND project_id=?`,
            [f.name, f.description, f.steps || '', i, f.id, id]
          );
        } else {
          await conn.query(
            `INSERT INTO project_feature (project_id, name, description, steps, sort_order) VALUES (?, ?, ?, ?, ?)`,
            [id, f.name, f.description, f.steps || '', i]
          );
        }
      }
    }

    await conn.commit();
    const project = await loadProjectFull(id);
    res.json(project);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: '更新项目失败' });
  } finally {
    conn.release();
  }
});

router.post('/projects/:id/publish', authRequired, async (req, res) => {
  try {
    const project = await loadProjectFull(req.params.id);
    if (!project) return res.status(404).json({ message: '项目不存在' });
    const errors = await validateForPublish(project);
    if (errors.length) return res.status(400).json({ message: errors.join('；') });
    await pool.query('UPDATE project SET status = \'published\', updated_at = NOW() WHERE id = ?', [req.params.id]);
    res.json({ message: '发布成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '发布失败' });
  }
});

router.post('/projects/:id/unpublish', authRequired, async (req, res) => {
  try {
    await pool.query('UPDATE project SET status = \'draft\', updated_at = NOW() WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    res.json({ message: '已转为草稿' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '操作失败' });
  }
});

router.delete('/projects/:id', authRequired, async (req, res) => {
  try {
    await pool.query('UPDATE project SET deleted_at = NOW(), status = \'draft\' WHERE id = ?', [req.params.id]);
    res.json({ message: '项目已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '删除失败' });
  }
});

router.post('/projects/:id/media', authRequired, async (req, res) => {
  try {
    const { type, url, caption = '', sort_order = 0 } = req.body;
    if (!['cover', 'image', 'video'].includes(type)) {
      return res.status(400).json({ message: '无效的媒体类型' });
    }
    const projectId = req.params.id;
    if (type === 'cover' || type === 'video') {
      await pool.query('DELETE FROM project_media WHERE project_id = ? AND type = ?', [projectId, type]);
    }
    const [result] = await pool.query(
      'INSERT INTO project_media (project_id, type, url, caption, sort_order) VALUES (?, ?, ?, ?, ?)',
      [projectId, type, url, caption, sort_order]
    );
    res.status(201).json({ id: result.insertId, type, url, caption, sort_order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '保存媒体失败' });
  }
});

router.delete('/media/:id', authRequired, async (req, res) => {
  try {
    await pool.query('DELETE FROM project_media WHERE id = ?', [req.params.id]);
    res.json({ message: '已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '删除失败' });
  }
});

router.put('/media/:id/order', authRequired, async (req, res) => {
  try {
    await pool.query('UPDATE project_media SET sort_order = ? WHERE id = ?', [req.body.sort_order || 0, req.params.id]);
    res.json({ message: '排序已更新' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '更新失败' });
  }
});

router.post('/features/:id/images', authRequired, async (req, res) => {
  try {
    const { url, caption = '', sort_order = 0 } = req.body;
    const [result] = await pool.query(
      'INSERT INTO feature_image (feature_id, url, caption, sort_order) VALUES (?, ?, ?, ?)',
      [req.params.id, url, caption, sort_order]
    );
    res.status(201).json({ id: result.insertId, url, caption, sort_order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '保存功能截图失败' });
  }
});

router.delete('/feature-images/:id', authRequired, async (req, res) => {
  try {
    await pool.query('DELETE FROM feature_image WHERE id = ?', [req.params.id]);
    res.json({ message: '已删除' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '删除失败' });
  }
});

router.get('/profile', authRequired, async (_req, res) => {
  const [rows] = await pool.query('SELECT title, introduction, skills FROM site_profile WHERE id = 1');
  res.json(rows[0] || {});
});

router.put('/profile', authRequired, async (req, res) => {
  const { title, introduction, skills } = req.body;
  await pool.query(
    'UPDATE site_profile SET title=?, introduction=?, skills=? WHERE id=1',
    [title || '', introduction || '', skills || '']
  );
  res.json({ message: '保存成功' });
});

router.get('/contact', authRequired, async (_req, res) => {
  const [rows] = await pool.query('SELECT show_contact, title, description, wechat_id FROM site_contact WHERE id = 1');
  res.json(rows[0] || {});
});

router.put('/contact', authRequired, async (req, res) => {
  const { show_contact, title, description, wechat_id } = req.body;
  await pool.query(
    'UPDATE site_contact SET show_contact=?, title=?, description=?, wechat_id=? WHERE id=1',
    [show_contact ? 1 : 0, title || '', description || '', wechat_id || '']
  );
  res.json({ message: '保存成功' });
});

export default router;
