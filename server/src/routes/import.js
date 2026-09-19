import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRequired } from '../middleware/auth.js';
import { parseDocxProject, importDocxToProject } from '../utils/docxImporter.js';
import { loadProjectFull } from '../utils/project.js';
import pool from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads');

function isWordFile(file) {
  const name = (file.originalname || '').toLowerCase();
  const mime = file.mimetype || '';
  return /\.docx?$/i.test(name) ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword';
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = isWordFile(file);
    cb(ok ? null : new Error('仅支持 .doc / .docx 格式的 Word 文档'), ok);
  }
});

const router = Router();

router.post('/preview', authRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: '请上传 Word 文档' });
    const parsed = await parseDocxProject(req.file.buffer, req.file.originalname);
    delete parsed._media;
    res.json({
      preview: {
        name: parsed.name,
        category: parsed.category,
        categoryRaw: parsed.categoryRaw,
        level: parsed.level,
        levelRaw: parsed.levelRaw,
        techs: parsed.techs,
        summary: parsed.summary,
        description: parsed.description,
        coverImage: parsed.coverImage,
        galleryCount: parsed.gallery?.length || 0,
        featureCount: parsed.features?.length || 0,
        docFormat: parsed.docFormat,
        docNotice: parsed.docNotice || '',
        features: parsed.features.map((f) => ({
          name: f.name,
          description: f.description?.slice(0, 120) + (f.description?.length > 120 ? '...' : ''),
          stepsCount: String(f.steps || '').split('\n').filter(Boolean).length,
          imageCount: f.images?.length || 0
        }))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || '文档解析失败，请确认模板格式' });
  }
});

router.post('/docx', authRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: '请上传 Word 文档' });
    const { projectId, parsed } = await importDocxToProject(
      pool,
      req.file.buffer,
      uploadDir,
      req.file.originalname
    );
    const project = await loadProjectFull(projectId);
    res.status(201).json({
      message: parsed.docNotice ? `导入成功（${parsed.docNotice}）` : '导入成功，已保存为草稿',
      projectId,
      project
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || '导入失败' });
  }
});

export default router;
