import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'project_shop';

async function init() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    multipleStatements: true
  });

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${DB_NAME}\``);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS admin_user (
      id INT PRIMARY KEY AUTO_INCREMENT,
      account VARCHAR(64) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      status TINYINT NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS project (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(80) NOT NULL,
      category VARCHAR(128) NOT NULL,
      level VARCHAR(16) DEFAULT '入门',
      summary VARCHAR(120) NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      status ENUM('draft','published') NOT NULL DEFAULT 'draft',
      sort_order INT NOT NULL DEFAULT 0,
      deleted_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_category (category),
      INDEX idx_sort (sort_order)
    );

    CREATE TABLE IF NOT EXISTS project_tech (
      id INT PRIMARY KEY AUTO_INCREMENT,
      project_id INT NOT NULL,
      tech_name VARCHAR(64) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_media (
      id INT PRIMARY KEY AUTO_INCREMENT,
      project_id INT NOT NULL,
      type ENUM('cover','image','video') NOT NULL,
      url VARCHAR(512) NOT NULL,
      caption VARCHAR(255) DEFAULT '',
      sort_order INT NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_feature (
      id INT PRIMARY KEY AUTO_INCREMENT,
      project_id INT NOT NULL,
      name VARCHAR(120) NOT NULL,
      description TEXT NOT NULL,
      steps TEXT,
      sort_order INT NOT NULL DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES project(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feature_image (
      id INT PRIMARY KEY AUTO_INCREMENT,
      feature_id INT NOT NULL,
      url VARCHAR(512) NOT NULL,
      caption VARCHAR(255) DEFAULT '',
      sort_order INT NOT NULL DEFAULT 0,
      FOREIGN KEY (feature_id) REFERENCES project_feature(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS site_profile (
      id INT PRIMARY KEY DEFAULT 1,
      title VARCHAR(120) NOT NULL DEFAULT '',
      introduction TEXT,
      skills VARCHAR(255) DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS site_contact (
      id INT PRIMARY KEY DEFAULT 1,
      show_contact TINYINT NOT NULL DEFAULT 1,
      title VARCHAR(120) DEFAULT '',
      description TEXT,
      wechat_id VARCHAR(64) DEFAULT ''
    );
  `);

  const account = process.env.ADMIN_ACCOUNT || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(password, 10);
  await conn.query(
    `INSERT INTO admin_user (account, password_hash) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [account, hash]
  );

  const [profileRows] = await conn.query('SELECT id FROM site_profile WHERE id = 1');
  if (profileRows.length === 0) {
    await conn.query(
      `INSERT INTO site_profile (id, title, introduction, skills) VALUES (1, ?, ?, ?)`,
      [
        '你好，我是项目创作者。',
        '这里展示我在全栈开发与项目实战中的作品。每个项目都围绕真实需求设计，涵盖需求分析、界面、功能实现与部署。',
        'Web 全栈 / 微信小程序 / AI 应用'
      ]
    );
  }

  const [contactRows] = await conn.query('SELECT id FROM site_contact WHERE id = 1');
  if (contactRows.length === 0) {
    await conn.query(
      `INSERT INTO site_contact (id, show_contact, title, description, wechat_id) VALUES (1, 1, ?, ?, ?)`,
      ['想进一步了解项目？', '欢迎联系我，交流项目设计、技术实现或合作想法。', 'projectlab_demo']
    );
  }

  const [projects] = await conn.query('SELECT COUNT(*) AS c FROM project WHERE deleted_at IS NULL');
  if (projects[0].c === 0) {
    await seedProjects(conn);
  }

  await conn.end();
  console.log('数据库初始化完成');
  console.log(`管理员账号: ${account} / ${password}`);
}

async function seedProjects(conn) {
  const samples = [
    {
      name: '校园二手交易平台',
      category: 'Java',
      level: '入门',
      summary: '商品发布、搜索、沟通与订单管理，构建完整的校园闲置交易流程。',
      description: '面向在校学生的一手物品交易平台，支持商品发布、搜索、在线沟通与订单管理，打造安全高效的校园交易环境。',
      sort_order: 1,
      techs: ['Java', 'Spring Boot', 'Vue', 'MySQL'],
      features: [
        {
          name: '商品发布与分类检索',
          description: '用户可以填写商品名称、价格、成色和描述，上传多张图片后发布商品。浏览者可按分类筛选，并通过关键词快速查找感兴趣的物品。',
          steps: '进入商品发布页面\n填写商品信息并上传图片\n选择分类并提交发布\n在列表中通过关键词或分类检索'
        },
        {
          name: '用户登录与个人中心',
          description: '用户登录后可以管理个人资料、查看自己发布的商品，并集中处理收藏、沟通记录和交易相关信息。',
          steps: '用户登录系统\n进入个人中心\n查看和管理个人资料与交易记录'
        }
      ]
    },
    {
      name: '智能简历分析助手',
      category: 'AI应用',
      level: '进阶',
      summary: '解析简历内容，结合岗位要求生成能力分析和优化建议。',
      description: '基于大语言模型的智能简历分析工具，支持简历解析、能力评估、优化建议与岗位匹配，帮助大学生提升求职竞争力。',
      sort_order: 2,
      techs: ['Python', 'FastAPI', 'AI'],
      features: [
        {
          name: '简历上传与结构化解析',
          description: '上传 PDF 或文档简历后，系统提取教育背景、项目经历和技能信息，并整理成统一的分析字段。',
          steps: '上传简历文件\n系统解析文档内容\n展示结构化简历信息'
        }
      ]
    },
    {
      name: '校园活动报名小程序',
      category: '小程序',
      level: '入门',
      summary: '活动展示、在线报名、签到与活动管理，覆盖完整参与流程。',
      description: '面向全校师生的活动发布与报名平台，支持活动浏览、在线报名、签到管理与活动回顾，助力打造更活跃的校园文化生活。',
      sort_order: 3,
      techs: ['微信小程序', '云开发'],
      features: [
        {
          name: '活动列表与详情',
          description: '用户可以浏览活动时间、地点、名额和介绍，并按状态筛选可报名的活动。',
          steps: '浏览活动列表\n查看活动详情\n确认报名条件'
        }
      ]
    }
  ];

  for (const s of samples) {
    const [result] = await conn.query(
      `INSERT INTO project (name, category, level, summary, description, status, sort_order)
       VALUES (?, ?, ?, ?, ?, 'published', ?)`,
      [s.name, s.category, s.level, s.summary, s.description, s.sort_order]
    );
    const projectId = result.insertId;
    for (let i = 0; i < s.techs.length; i++) {
      await conn.query(
        'INSERT INTO project_tech (project_id, tech_name, sort_order) VALUES (?, ?, ?)',
        [projectId, s.techs[i], i]
      );
    }
    for (let i = 0; i < s.features.length; i++) {
      const f = s.features[i];
      await conn.query(
        `INSERT INTO project_feature (project_id, name, description, steps, sort_order) VALUES (?, ?, ?, ?, ?)`,
        [projectId, f.name, f.description, f.steps, i]
      );
    }
  }
}

init().catch((err) => {
  console.error('数据库初始化失败:', err);
  process.exit(1);
});
