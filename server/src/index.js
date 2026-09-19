import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import importRoutes from './routes/import.js';
import pool from './db.js';

dotenv.config();

async function ensureSchema() {
  try {
    await pool.query(`ALTER TABLE project MODIFY category VARCHAR(128) NOT NULL DEFAULT '其他'`);
  } catch {
    // 表尚未创建或已是最新结构
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const uploadDir = path.resolve(__dirname, '../', process.env.UPLOAD_DIR || 'uploads');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'projectlab-api' });
});

app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin/import', importRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || '服务器错误' });
});

ensureSchema().finally(() => {
  app.listen(PORT, () => {
    console.log(`ProjectLab API running at http://127.0.0.1:${PORT}`);
  });
});
