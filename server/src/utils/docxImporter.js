import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import WordExtractor from 'word-extractor';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WNS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const ANS = 'http://schemas.openxmlformats.org/drawingml/2006/main';

function stripHtml(s) {
  return String(s || '')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .trim();
}

function mapCategory(raw) {
  const s = raw || '';
  const cats = [];
  if (/小程序/.test(s)) cats.push('小程序');
  if (/android/i.test(s)) cats.push('Android');
  if (/vue/i.test(s)) cats.push('Vue');
  if (/mysql/i.test(s)) cats.push('MySQL');
  if (/python/i.test(s)) cats.push('Python');
  if (/java/i.test(s)) cats.push('Java');
  if (/AI|人工智能|大模型|智能/.test(s)) cats.push('AI应用');
  return cats.length ? cats.join(',') : '其他';
}

function mapLevel(raw) {
  const s = raw || '';
  if (/入门|简单|初级|低/.test(s)) return '入门';
  if (/高级|较高|困难|高/.test(s)) return '高级';
  return '进阶';
}

function parseLabeled(text, label) {
  const re = new RegExp(`^${label}[：:]\\s*(.+)$`);
  const m = text.match(re);
  return m ? stripHtml(m[1]) : '';
}

function isFeatureSection(text) {
  return /^3(?:\.\d+)?\s/.test(text) || /^功能名称[：:]/.test(text);
}

function isDocxBuffer(buffer) {
  return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function isDocBuffer(buffer) {
  return buffer.length >= 8 &&
    buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
}

async function convertDocToDocx(buffer, filename = 'upload.doc') {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'word-import-'));
  const safeName = filename.toLowerCase().endsWith('.doc') ? filename : 'upload.doc';
  const docPath = path.join(tmpDir, path.basename(safeName));
  fs.writeFileSync(docPath, buffer);

  const sofficePaths = [
    'soffice',
    'libreoffice',
    '/Applications/LibreOffice.app/Contents/MacOS/soffice'
  ];

  for (const bin of sofficePaths) {
    try {
      await execFileAsync(bin, ['--headless', '--convert-to', 'docx', '--outdir', tmpDir, docPath], {
        timeout: 120000
      });
      const outName = path.basename(docPath, path.extname(docPath)) + '.docx';
      const outPath = path.join(tmpDir, outName);
      if (fs.existsSync(outPath)) {
        const docxBuffer = fs.readFileSync(outPath);
        fs.rmSync(tmpDir, { recursive: true, force: true });
        return docxBuffer;
      }
    } catch {
      // try next converter
    }
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
  return null;
}

async function extractParagraphsFromDoc(buffer) {
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  const body = doc.getBody() || '';
  const items = body
    .split(/\r?\n/)
    .map((line) => stripHtml(line.trim()))
    .filter(Boolean)
    .map((text) => ({ text, images: [] }));
  return { items, media: {}, docFormat: 'doc' };
}

async function readZipText(zip, candidates) {
  for (const name of candidates) {
    const file = zip.file(name);
    if (file) return file.async('string');
  }
  return '';
}

async function extractParagraphsFromDocx(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new Error('无效的 Word 文档：缺少 document.xml，请确认文件未损坏或重新另存为 .docx');
  }
  const docXml = await docFile.async('string');
  const relsXml = await readZipText(zip, [
    'word/_rels/document.xml.rels',
    'word/_rels/document.xml.rels'.toLowerCase()
  ]);

  const ridMap = {};
  for (const m of relsXml.matchAll(/Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)) {
    if (m[2].includes('media/')) ridMap[m[1]] = m[2].split('/').pop();
  }

  const items = [];
  for (const pMatch of docXml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)) {
    const pXml = pMatch[0];
    const texts = [...pXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((x) => x[1]);
    const text = stripHtml(texts.join(''));
    const images = [];
    for (const m of pXml.matchAll(/r:embed="([^"]+)"/g)) {
      const file = ridMap[m[1]];
      if (file) images.push(file);
    }
    if (text || images.length) items.push({ text, images });
  }

  const media = {};
  for (const name of Object.keys(zip.files)) {
    if (name.startsWith('word/media/')) {
      const fname = name.split('/').pop();
      const mediaFile = zip.file(name);
      if (mediaFile) media[fname] = await mediaFile.async('nodebuffer');
    }
  }

  return { items, media, docFormat: 'docx' };
}

async function extractParagraphs(buffer, filename = '') {
  if (isDocxBuffer(buffer)) {
    return extractParagraphsFromDocx(buffer);
  }

  if (isDocBuffer(buffer) || /\.doc$/i.test(filename)) {
    const docxBuffer = await convertDocToDocx(buffer, filename);
    if (docxBuffer) {
      return extractParagraphsFromDocx(docxBuffer);
    }
    return extractParagraphsFromDoc(buffer);
  }

  throw new Error('无法识别的 Word 文档格式，请上传 .doc 或 .docx 文件');
}

function parseProjectContent(items) {
  const result = {
    name: '',
    categoryRaw: '',
    category: '其他',
    levelRaw: '',
    level: '进阶',
    techs: [],
    summary: '',
    description: '',
    coverImage: null,
    gallery: [],
    features: []
  };

  let section = 'header';
  let introMode = '';
  const introParts = [];
  let currentFeature = null;
  let featureMode = '';

  const flushFeature = () => {
    if (currentFeature && currentFeature.name) {
      currentFeature.steps = currentFeature.stepsLines.join('\n');
      delete currentFeature.stepsLines;
      result.features.push(currentFeature);
    }
    currentFeature = null;
    featureMode = '';
  };

  for (const item of items) {
    const { text, images } = item;

    if (text === '1 基本功能') {
      section = 'basic';
      continue;
    }
    if (text === '1.1 简短简介') {
      section = 'summary';
      continue;
    }
    if (text === '1.2 整体简介') {
      section = 'description';
      introMode = '';
      continue;
    }
    if (text === '2 项目图片') {
      section = 'images';
      continue;
    }
    if (text === '2.1 封面图' || text.startsWith('2.2 ')) {
      section = 'images';
      continue;
    }
    if (text === '3 核心功能' || /^3 核心功能/.test(text)) {
      flushFeature();
      section = 'features';
      continue;
    }

    if (section === 'basic') {
      if (text.startsWith('项目名称')) result.name = parseLabeled(text, '项目名称');
      if (text.startsWith('技术方向')) {
        result.categoryRaw = parseLabeled(text, '技术方向');
        result.category = mapCategory(result.categoryRaw);
      }
      if (text.startsWith('难度')) {
        result.levelRaw = parseLabeled(text, '难度');
        result.level = mapLevel(result.levelRaw);
      }
      if (text.startsWith('主要技术')) {
        const raw = parseLabeled(text, '主要技术');
        result.techs = raw.split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
      }
      continue;
    }

    if (section === 'summary' && text && !text.startsWith('1.')) {
      result.summary = text;
      continue;
    }

    if (section === 'description') {
      if (text.startsWith('（社会困境）')) introMode = 'dilemma';
      else if (text.startsWith('（项目技术）')) introMode = 'tech';
      else if (text.startsWith('（解决问题）')) introMode = 'solution';
      else if (text && introMode) introParts.push(text);
      continue;
    }

    if (section === 'images') {
      for (const img of images) {
        if (!result.coverImage && /图2-1|封面/.test(text) || (!result.coverImage && result.gallery.length === 0 && images.includes(img))) {
          // cover: first image in section 2 or before 图2-2
        }
      }
      if (images.length) {
        const captionNext = text.startsWith('图2-');
        if (!result.coverImage && (text === '' || captionNext)) {
          if (!result.coverImage) {
            result.coverImage = { file: images[0], caption: '' };
            continue;
          }
        }
        if (images.length && text === '') {
          if (!result.coverImage) {
            result.coverImage = { file: images[0], caption: '' };
          } else {
            result.gallery.push({ file: images[0], caption: '' });
          }
          continue;
        }
      }
      if (text.startsWith('图2-1')) {
        if (result.coverImage) result.coverImage.caption = text;
      } else if (text.startsWith('图2-') && result.gallery.length) {
        result.gallery[result.gallery.length - 1].caption = text;
      } else if (text.startsWith('图2-') && result.coverImage && !result.coverImage.caption) {
        result.coverImage.caption = text;
      }
      continue;
    }

    if (section === 'features') {
      // 仅通过「功能名称」创建功能项，忽略 3.x 小节标题避免重复
      if (/^3\.\d+\s/.test(text)) continue;

      if (text.startsWith('功能名称：') || text.startsWith('功能名称:')) {
        flushFeature();
        currentFeature = {
          name: parseLabeled(text, '功能名称'),
          description: '',
          stepsLines: [],
          images: []
        };
        featureMode = 'desc';
        continue;
      }
      if (!currentFeature) continue;

      if (text.startsWith('功能描述：') || text.startsWith('功能描述:')) {
        currentFeature.description = parseLabeled(text, '功能描述');
        featureMode = 'desc';
        continue;
      }
      if (text === '操作流程：' || text === '操作流程:') {
        featureMode = 'steps';
        continue;
      }
      if (text === '功能截图：' || text === '功能截图:') {
        featureMode = 'shots';
        continue;
      }
      if (featureMode === 'steps' && /^\d+\.\s/.test(text)) {
        currentFeature.stepsLines.push(text.replace(/^\d+\.\s*/, ''));
        continue;
      }
      if (featureMode === 'desc' && text && !text.startsWith('图3-') && !/^3\.\d+/.test(text)) {
        currentFeature.description += (currentFeature.description ? '\n' : '') + text;
        continue;
      }
      if (images.length && currentFeature) {
        for (const file of images) {
          currentFeature.images.push({ file, caption: '' });
        }
        if (text.startsWith('图3-')) {
          currentFeature.images[currentFeature.images.length - 1].caption = text;
        }
        continue;
      }
      if (text.startsWith('图3-') && currentFeature?.images?.length) {
        currentFeature.images[currentFeature.images.length - 1].caption = text;
      }
    }
  }

  flushFeature();
  result.description = introParts.join('\n\n') || result.summary;

  // Fix cover/gallery: re-walk images section more reliably
  result.coverImage = null;
  result.gallery = [];
  let inImages = false;
  let pendingImage = null;
  for (const item of items) {
    if (item.text === '2 项目图片') inImages = true;
    if (item.text === '3 核心功能' || item.text.startsWith('3 核心功能')) break;
    if (!inImages) continue;
    if (item.images.length) pendingImage = item.images[0];
    if (item.text.startsWith('图2-1') && pendingImage) {
      result.coverImage = { file: pendingImage, caption: item.text };
      pendingImage = null;
    } else if (item.text.startsWith('图2-') && item.text !== '图2-1 项目封面图' && pendingImage) {
      result.gallery.push({ file: pendingImage, caption: item.text });
      pendingImage = null;
    } else if (item.images.length && !item.text) {
      pendingImage = item.images[0];
    }
  }

  return result;
}

export async function parseDocxProject(buffer, filename = '') {
  const { items, media, docFormat } = await extractParagraphs(buffer, filename);
  const parsed = parseProjectContent(items);

  if (!parsed.name) {
    const title = items.find((x) => x.text && !x.text.includes('项目内容提取'))?.text;
    parsed.name = title || '导入项目';
  }
  if (!parsed.summary && parsed.description) {
    parsed.summary = parsed.description.slice(0, 100);
  }

  parsed._media = media;
  parsed.docFormat = docFormat;
  if (docFormat === 'doc') {
    parsed.docNotice = '当前为 .doc 格式，文字内容已导入；图片需另存为 .docx 后重新导入，或安装 LibreOffice 以自动转换。';
  }
  return parsed;
}

export async function saveImportedMedia(parsed, uploadDir) {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const saveBuffer = (buf, ext) => {
    const name = `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    fs.writeFileSync(path.join(uploadDir, name), buf);
    return `/uploads/${name}`;
  };

  const extOf = (file) => path.extname(file || '.png') || '.png';

  if (parsed.coverImage?.file && parsed._media[parsed.coverImage.file]) {
    parsed.coverUrl = saveBuffer(parsed._media[parsed.coverImage.file], extOf(parsed.coverImage.file));
    parsed.coverCaption = parsed.coverImage.caption;
  }

  parsed.galleryUrls = [];
  for (const g of parsed.gallery) {
    if (parsed._media[g.file]) {
      parsed.galleryUrls.push({
        url: saveBuffer(parsed._media[g.file], extOf(g.file)),
        caption: g.caption
      });
    }
  }

  for (const feature of parsed.features) {
    feature.imageUrls = [];
    for (const img of feature.images || []) {
      if (parsed._media[img.file]) {
        feature.imageUrls.push({
          url: saveBuffer(parsed._media[img.file], extOf(img.file)),
          caption: img.caption
        });
      }
    }
  }

  delete parsed._media;
  delete parsed.coverImage;
  delete parsed.gallery;
  for (const f of parsed.features) delete f.images;

  return parsed;
}

export async function importDocxToProject(pool, buffer, uploadDir, filename = '') {
  let parsed = await parseDocxProject(buffer, filename);
  parsed = await saveImportedMedia(parsed, uploadDir);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const summary = (parsed.summary || parsed.description || '').slice(0, 100);
    const [result] = await conn.query(
      `INSERT INTO project (name, category, level, summary, description, status, sort_order)
       VALUES (?, ?, ?, ?, ?, 'draft', 0)`,
      [parsed.name, parsed.category, parsed.level, summary, parsed.description]
    );
    const projectId = result.insertId;

    for (let i = 0; i < parsed.techs.length; i++) {
      await conn.query(
        'INSERT INTO project_tech (project_id, tech_name, sort_order) VALUES (?, ?, ?)',
        [projectId, parsed.techs[i], i]
      );
    }

    if (parsed.coverUrl) {
      await conn.query(
        'INSERT INTO project_media (project_id, type, url, caption, sort_order) VALUES (?, \'cover\', ?, ?, 0)',
        [projectId, parsed.coverUrl, parsed.coverCaption || '']
      );
    }

    for (let i = 0; i < parsed.galleryUrls.length; i++) {
      const g = parsed.galleryUrls[i];
      await conn.query(
        'INSERT INTO project_media (project_id, type, url, caption, sort_order) VALUES (?, \'image\', ?, ?, ?)',
        [projectId, g.url, g.caption || '', i]
      );
    }

    for (let fi = 0; fi < parsed.features.length; fi++) {
      const f = parsed.features[fi];
      const [fr] = await conn.query(
        'INSERT INTO project_feature (project_id, name, description, steps, sort_order) VALUES (?, ?, ?, ?, ?)',
        [projectId, f.name, f.description, f.steps || '', fi]
      );
      for (let ii = 0; ii < (f.imageUrls || []).length; ii++) {
        const img = f.imageUrls[ii];
        await conn.query(
          'INSERT INTO feature_image (feature_id, url, caption, sort_order) VALUES (?, ?, ?, ?)',
          [fr.insertId, img.url, img.caption || '', ii]
        );
      }
    }

    await conn.commit();
    return { projectId, parsed };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
