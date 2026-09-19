<template>
  <div>
    <div class="heading">
      <div>
        <h1>项目管理</h1>
        <p>发布、编辑和整理展示项目</p>
      </div>
      <el-button type="primary" @click="$router.push('/projects/new')">＋ 新建项目</el-button>
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
        <el-table-column prop="category" label="技术方向" width="100" />
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
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';

const keyword = ref('');
const status = ref('all');
const list = ref([]);
const loading = ref(false);

function formatDate(v) {
  return v ? new Date(v).toLocaleString('zh-CN') : '';
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
.panel { background: #fff; border: 1px solid #e1e9f3; border-radius: 15px; padding: 22px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; }
</style>
