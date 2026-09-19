import { Router } from 'express';
import pool from '../db.js';
import { loadProjectFull, formatProjectListItem } from '../utils/project.js';
import { PROJECT_CATEGORIES } from '../constants/categories.js';

const router = Router();

router.get('/projects', async (req, res) => {
  try {
    const { keyword = '', category = '', level = '', page = 1, pageSize = 20 } = req.query;
    const offset = (Math.max(Number(page), 1) - 1) * Math.min(Number(pageSize) || 20, 50);
    const limit = Math.min(Number(pageSize) || 20, 50);

    let sql = `
      SELECT p.*,
        (SELECT url FROM project_media pm WHERE pm.project_id = p.id AND pm.type = 'cover' ORDER BY pm.sort_order LIMIT 1) AS cover_url,
        (SELECT GROUP_CONCAT(pt.tech_name ORDER BY pt.sort_order SEPARATOR '||') FROM project_tech pt WHERE pt.project_id = p.id) AS techs
      FROM project p
      WHERE p.status = 'published' AND p.deleted_at IS NULL
    `;
    const params = [];

    if (category && category !== '全部') {
      sql += ` AND CONCAT(',', REPLACE(p.category, '，', ','), ',') LIKE ?`;
      params.push(`%,${category},%`);
    }
    if (level && level !== '全部') {
      sql += ' AND p.level = ?';
      params.push(level);
    }
    if (keyword.trim()) {
      sql += ` AND (
        p.name LIKE ? OR p.summary LIKE ? OR p.description LIKE ? OR
        EXISTS (SELECT 1 FROM project_tech pt WHERE pt.project_id = p.id AND pt.tech_name LIKE ?)
      )`;
      const kw = `%${keyword.trim()}%`;
      params.push(kw, kw, kw, kw);
    }

    const countSql = sql.replace(/SELECT p\.\*,[\s\S]*?FROM project p/, 'SELECT COUNT(*) AS total FROM project p');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    sql += ' ORDER BY p.sort_order ASC, p.updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);
    res.json({
      total,
      list: rows.map(formatProjectListItem)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '获取项目列表失败' });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const project = await loadProjectFull(req.params.id, { publishedOnly: true });
    if (!project) return res.status(404).json({ message: '项目不存在或未发布' });
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '获取项目详情失败' });
  }
});

router.get('/features/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.*, p.id AS project_id, p.name AS project_name, p.status, p.deleted_at
       FROM project_feature f
       JOIN project p ON p.id = f.project_id
       WHERE f.id = ?`,
      [req.params.id]
    );
    if (!rows.length || rows[0].status !== 'published' || rows[0].deleted_at) {
      return res.status(404).json({ message: '功能不存在或项目未发布' });
    }
    const feature = rows[0];
    const [images] = await pool.query(
      'SELECT id, url, caption, sort_order FROM feature_image WHERE feature_id = ? ORDER BY sort_order',
      [feature.id]
    );
    feature.images = images;
    feature.steps_list = (feature.steps || '').split('\n').filter(Boolean);
    res.json(feature);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '获取功能详情失败' });
  }
});

router.get('/site/config', async (req, res) => {
  try {
    const [profiles] = await pool.query('SELECT title, introduction, skills FROM site_profile WHERE id = 1');
    const [contacts] = await pool.query('SELECT show_contact, title, description, wechat_id FROM site_contact WHERE id = 1');
    const profile = profiles[0] || {};
    const contact = contacts[0] || { show_contact: 1 };
    const showContact = Boolean(contact.show_contact);

    const result = {
      profile: {
        title: profile.title || '',
        introduction: profile.introduction || '',
        skills: profile.skills || ''
      },
      show_contact: showContact
    };

    if (showContact) {
      result.contact = {
        title: contact.title || '',
        description: contact.description || '',
        wechat_id: contact.wechat_id || ''
      };
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '获取站点配置失败' });
  }
});

router.get('/categories', async (_req, res) => {
  res.json(['全部', ...PROJECT_CATEGORIES]);
});

router.get('/levels', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT level FROM project
      WHERE status = 'published' AND deleted_at IS NULL AND level IS NOT NULL AND level != ''
      ORDER BY FIELD(level, '入门', '进阶', '高级'), level
    `);
    const levels = rows.map((r) => r.level);
    res.json(['全部', ...levels]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '获取难度选项失败' });
  }
});

export default router;
