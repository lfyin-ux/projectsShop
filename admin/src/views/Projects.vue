<template>
  <div>
    <div class="heading">
      <div>
        <h1>项目管理</h1>
        <p>发布、编辑和整理展示项目</p>
      </div>
      <div class="actions">
        <el-button @click="openImport">📥 导入项目</el-button>
        <el-button type="primary" @click="$router.push('/projects/new')">＋ 新建项目</el-button>
      </div>
    </div>
    <div class="panel">
      <div class="toolbar">
        <el-input v-model="keyword" placeholder="搜索项目名称或技术栈" clearable style="max-width:300px" />
        <el-select v-model="status" style="width:145px">
          <el-option label="全部状态" value="all" />
          <el-option label="已发布" value="published" />
          <el-option label="草稿" value="draft" />
        </el-select>
      </div>
      <el-table :data="list" v-loading="loading">
        <el-table-column prop="name" label="项目名称" min-width="160" />
        <el-table-column label="技术方向" width="160">
          <template #default="{ row }">{{ row.categories?.join('、') || row.category }}</template>
        </el-table-column>
        <el-table-column label="核心功能" width="100">
          <template #default="{ row }">{{ row.feature_count }} 项</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small">
              {{ row.status === 'published' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ formatDate(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="$router.push(`/projects/${row.id}/edit`)">编辑</el-button>
            <el-button size="small" @click="toggleStatus(row)">
              {{ row.status === 'published' ? '转草稿' : '发布' }}
            </el-button>
            <el-button size="small" type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="importVisible" title="导入项目（Word 模板）" width="640px" destroy-on-close>
      <p class="import-tip">
        请上传「项目内容提取」Word 模板（支持 .doc / .docx），选择文件后会自动解析预览，确认无误后点击「确认导入」即可。
      </p>
      <el-upload
        drag
        accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        :auto-upload="false"
        :limit="1"
        :on-change="onFileChange"
        :on-remove="clearImport"
      >
        <div class="el-upload__text">拖拽 .doc / .docx 到此处，或 <em>点击选择</em></div>
      </el-upload>

      <el-alert v-if="preview?.docNotice" :title="preview.docNotice" type="warning" show-icon :closable="false" style="margin-top:16px" />

      <div v-if="preview" class="preview-box">
        <h3>识别预览</h3>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="项目名称" :span="2">{{ preview.name }}</el-descriptions-item>
          <el-descriptions-item label="技术方向">{{ preview.category?.replace(/,/g, '、') }}</el-descriptions-item>
          <el-descriptions-item label="难度">{{ preview.level }}</el-descriptions-item>
          <el-descriptions-item label="主要技术" :span="2">{{ preview.techs?.join('、') }}</el-descriptions-item>
          <el-descriptions-item label="简短简介" :span="2">{{ preview.summary }}</el-descriptions-item>
          <el-descriptions-item label="封面图">{{ preview.coverImage ? '✓ 已识别' : '未找到' }}</el-descriptions-item>
          <el-descriptions-item label="展示图">{{ preview.galleryCount }} 张</el-descriptions-item>
          <el-descriptions-item label="核心功能" :span="2">{{ preview.featureCount }} 项</el-descriptions-item>
        </el-descriptions>
        <ul v-if="preview.features?.length" class="feature-preview">
          <li v-for="f in preview.features" :key="f.name">
            {{ f.name }}（{{ f.imageCount }} 张截图，{{ f.stepsCount }} 个步骤）
          </li>
        </ul>
      </div>

      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button :disabled="!importFile" :loading="previewing" @click="doPreview">解析预览</el-button>
        <el-button type="primary" :disabled="!importFile || previewing" :loading="importing" @click="doImport">确认导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import api, { previewImportDocx, importDocx } from '../api';

const router = useRouter();
const keyword = ref('');
const status = ref('all');
const list = ref([]);
const loading = ref(false);

const importVisible = ref(false);
const importFile = ref(null);
const preview = ref(null);
const previewing = ref(false);
const importing = ref(false);

function formatDate(v) {
  return v ? new Date(v).toLocaleString('zh-CN') : '';
}

function openImport() {
  importVisible.value = true;
  clearImport();
}

async function onFileChange(uploadFile) {
  importFile.value = uploadFile?.raw || null;
  preview.value = null;
  if (importFile.value) await doPreview();
}

function clearImport() {
  importFile.value = null;
  preview.value = null;
}

async function doPreview() {
  if (!importFile.value) return;
  previewing.value = true;
  try {
    const data = await previewImportDocx(importFile.value);
    preview.value = data.preview;
    ElMessage.success('文档解析成功');
  } finally {
    previewing.value = false;
  }
}

async function doImport() {
  if (!importFile.value) return;
  importing.value = true;
  try {
    const data = await importDocx(importFile.value);
    ElMessage.success(data.message || '导入成功');
    importVisible.value = false;
    await load();
    router.push(`/projects/${data.projectId}/edit`);
  } finally {
    importing.value = false;
  }
}

async function load() {
  loading.value = true;
  try {
    list.value = await api.get('/admin/projects', { params: { keyword: keyword.value, status: status.value } });
  } finally {
    loading.value = false;
  }
}

async function toggleStatus(row) {
  if (row.status === 'published') {
    await api.post(`/admin/projects/${row.id}/unpublish`);
    ElMessage.success('已转为草稿');
  } else {
    await api.post(`/admin/projects/${row.id}/publish`);
    ElMessage.success('发布成功');
  }
  load();
}

async function remove(row) {
  await ElMessageBox.confirm(`确定删除「${row.name}」吗？`, '确认删除', { type: 'warning' });
  await api.delete(`/admin/projects/${row.id}`);
  ElMessage.success('项目已删除');
  load();
}

watch([keyword, status], load);
onMounted(load);
</script>

<style scoped>
.heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.heading h1 { margin: 0; font-size: 24px; }
.heading p { margin: 4px 0 0; color: #7c8da6; }
.actions { display: flex; gap: 10px; }
.panel { background: #fff; border: 1px solid #e1e9f3; border-radius: 15px; padding: 22px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; }
.import-tip { color: #7c8da6; font-size: 13px; margin: 0 0 16px; line-height: 1.6; }
.preview-box { margin-top: 20px; }
.preview-box h3 { margin: 0 0 12px; font-size: 15px; }
.feature-preview { margin: 12px 0 0; padding-left: 20px; color: #647d9d; font-size: 13px; line-height: 1.8; max-height: 180px; overflow: auto; }
</style>
