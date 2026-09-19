<template>
  <div>
    <div class="heading">
      <div>
        <h1>早上好，欢迎回来</h1>
        <p>管理你的小程序项目展示内容</p>
      </div>
      <el-button type="primary" @click="$router.push('/projects/new')">＋ 新建项目</el-button>
    </div>
    <div class="stats">
      <div class="stat" v-for="item in statItems" :key="item.label">
        <span>{{ item.label }}</span>
        <b>{{ item.value }}</b>
        <small>{{ item.hint }}</small>
      </div>
    </div>
    <div class="panel">
      <h2>常用操作</h2>
      <div class="quick">
        <button @click="$router.push('/projects')"><b>📥 导入项目</b><span>从 Word 模板一键导入</span></button>
        <button @click="$router.push('/projects/new')"><b>＋ 添加项目</b><span>填写项目简介与主要技术</span></button>
        <button @click="$router.push('/projects')"><b>▧ 管理项目内容</b><span>维护图片、视频和核心功能</span></button>
        <button @click="$router.push('/contact')"><b>✉ 更新联系方式</b><span>修改展示给访客的微信号</span></button>
      </div>
    </div>
    <div class="panel">
      <h2>最近项目</h2>
      <div v-if="recent.length">
        <div v-for="p in recent" :key="p.id" class="recent-row">
          {{ p.name }}
          <el-tag :type="p.status === 'published' ? 'success' : 'info'" size="small">
            {{ p.status === 'published' ? '已发布' : '草稿' }}
          </el-tag>
        </div>
      </div>
      <div v-else class="empty">还没有项目，先新建一个吧。</div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import api from '../api';

const stats = ref({ total: 0, published: 0, draft: 0, media_count: 0 });
const recent = ref([]);

const statItems = computed(() => [
  { label: '项目总数', value: stats.value.total, hint: '全部项目' },
  { label: '已发布', value: stats.value.published, hint: '小程序可见' },
  { label: '草稿', value: stats.value.draft, hint: '仅后台可见' },
  { label: '展示素材', value: stats.value.media_count, hint: '图片与视频' }
]);

onMounted(async () => {
  const data = await api.get('/admin/dashboard');
  stats.value = data.stats;
  recent.value = data.recent;
});
</script>

<style scoped>
.heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.heading h1 { margin: 0; font-size: 24px; }
.heading p { margin: 4px 0 0; color: #7c8da6; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 18px; }
.stat { padding: 21px; background: #fff; border: 1px solid #e1e9f3; border-radius: 14px; }
.stat span { color: #8a9ab0; }
.stat b { display: block; font-size: 27px; margin: 5px 0; color: #2b558d; }
.stat small { color: #9bacc2; }
.panel { background: #fff; border: 1px solid #e1e9f3; border-radius: 15px; padding: 22px; margin-bottom: 18px; }
.panel h2 { margin: 0 0 16px; font-size: 17px; }
.quick { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.quick button {
  text-align: left; border: 1px solid #dfeaf9; background: #f6faff; border-radius: 12px;
  padding: 17px; color: #365d92; cursor: pointer;
}
.quick b, .quick span { display: block; }
.quick span { font-size: 12px; color: #8ca0bb; margin-top: 4px; }
.recent-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 9px 0; border-bottom: 1px solid #edf1f7;
}
.empty { text-align: center; color: #8e9eb2; padding: 35px; }
@media (max-width: 800px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .quick { grid-template-columns: 1fr; }
}
</style>
