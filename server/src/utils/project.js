import pool from '../db.js';

export function parseTechInput(input) {
  if (!input) return [];
  return [...new Set(
    String(input)
      .split(/[,，、·|/]/)
      .map((s) => s.trim())
      .filter(Boolean)
  )];
}

export async function loadProjectFull(id, { publishedOnly = false } = {}) {
  const where = publishedOnly
    ? 'p.id = ? AND p.status = \'published\' AND p.deleted_at IS NULL'
    : 'p.id = ? AND p.deleted_at IS NULL';
  const [rows] = await pool.query(`SELECT p.* FROM project p WHERE ${where}`, [id]);
  if (!rows.length) return null;
  const project = rows[0];

  const [techs] = await pool.query(
    'SELECT tech_name, sort_order FROM project_tech WHERE project_id = ? ORDER BY sort_order',
    [id]
  );
  const [media] = await pool.query(
    'SELECT id, type, url, caption, sort_order FROM project_media WHERE project_id = ? ORDER BY sort_order',
    [id]
  );
  const [features] = await pool.query(
    'SELECT id, name, description, steps, sort_order FROM project_feature WHERE project_id = ? ORDER BY sort_order',
    [id]
  );

  for (const feature of features) {
    const [images] = await pool.query(
      'SELECT id, url, caption, sort_order FROM feature_image WHERE feature_id = ? ORDER BY sort_order',
      [feature.id]
    );
    feature.images = images;
  }

  project.techs = techs.map((t) => t.tech_name);
  project.media = media;
  project.features = features;
  project.cover = media.find((m) => m.type === 'cover') || null;
  project.images = media.filter((m) => m.type === 'image');
  project.video = media.find((m) => m.type === 'video') || null;
  return project;
}

export async function validateForPublish(project) {
  const errors = [];
  if (!project.name?.trim()) errors.push('请填写项目名称');
  if (!project.category?.trim()) errors.push('请选择技术方向');
  if (!project.description?.trim()) errors.push('请填写项目简介');
  if (!project.techs?.length) errors.push('请至少添加一项主要技术');
  if (!project.cover) errors.push('请上传封面图');
  if (!project.features?.length) errors.push('请至少添加一项核心功能');
  for (const f of project.features || []) {
    if (!f.name?.trim()) errors.push('核心功能名称不能为空');
    if (!f.description?.trim()) errors.push(`功能「${f.name || '未命名'}」缺少描述`);
  }
  return errors;
}

export function formatProjectListItem(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    level: row.level,
    summary: row.summary,
    sort_order: row.sort_order,
    updated_at: row.updated_at,
    cover_url: row.cover_url || null,
    techs: row.techs ? row.techs.split('||') : []
  };
}
