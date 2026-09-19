<template>
  <div v-loading="loading">
    <div class="heading">
      <div>
        <el-button size="small" @click="$router.push('/projects')">← 返回项目列表</el-button>
        <h1>{{ isNew ? '新建项目' : '编辑项目' }}</h1>
      </div>
      <div>
        <el-button @click="save('draft')">保存草稿</el-button>
        <el-button type="primary" @click="save('published')">发布项目</el-button>
      </div>
    </div>
    <div class="panel">
      <el-tabs v-model="tab">
        <el-tab-pane label="基本信息" name="basic">
          <el-form label-width="100px" style="max-width:800px">
            <el-form-item label="项目名称" required>
              <el-input v-model="form.name" placeholder="例如：校园二手交易平台" />
            </el-form-item>
            <el-form-item label="技术方向" required>
              <el-select v-model="form.category">
                <el-option v-for="c in categories.slice(1)" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
            <el-form-item label="难度">
              <el-select v-model="form.level">
                <el-option label="入门" value="入门" />
                <el-option label="进阶" value="进阶" />
                <el-option label="高级" value="高级" />
              </el-select>
            </el-form-item>
            <el-form-item label="主要技术" required>
              <el-input v-model="techInput" placeholder="Java、Spring Boot、Vue、MySQL" />
              <div class="help">用顿号、逗号或「·」分隔，前台展示为技术标签。</div>
            </el-form-item>
            <el-form-item label="简短简介">
              <el-input v-model="form.summary" maxlength="100" show-word-limit placeholder="用于列表卡片，最多100字" />
            </el-form-item>
            <el-form-item label="项目简介" required>
              <el-input v-model="form.description" type="textarea" :rows="5" />
            </el-form-item>
            <el-form-item label="排序值">
              <el-input-number v-model="form.sort_order" :min="0" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="展示图片与视频" name="media" :disabled="!projectId">
          <div v-if="!projectId" class="help">请先保存基本信息后再上传素材。</div>
          <template v-else>
            <div class="media-block">
              <h3>项目封面图 <span class="req">*</span></h3>
              <el-upload :show-file-list="false" accept="image/*" :http-request="(o) => uploadMedia(o, 'cover')">
                <el-button>上传封面</el-button>
              </el-upload>
              <img v-if="cover?.url" :src="cover.url" class="preview" />
            </div>
            <div class="media-block">
              <h3>项目展示图片</h3>
              <el-upload :show-file-list="false" accept="image/*" multiple :http-request="(o) => uploadMedia(o, 'image')">
                <el-button>添加展示图片</el-button>
              </el-upload>
              <div class="preview-list">
                <div v-for="img in images" :key="img.id" class="preview-item">
                  <img :src="img.url" />
                  <el-button size="small" type="danger" @click="deleteMedia(img.id)">删除</el-button>
                </div>
              </div>
            </div>
            <div class="media-block">
              <h3>演示视频</h3>
              <el-upload :show-file-list="false" accept="video/*" :http-request="(o) => uploadMedia(o, 'video')">
                <el-button>上传视频</el-button>
              </el-upload>
              <video v-if="video?.url" :src="video.url" controls class="video-preview" />
              <el-button v-if="video" size="small" type="danger" @click="deleteMedia(video.id)">删除视频</el-button>
            </div>
          </template>
        </el-tab-pane>

        <el-tab-pane label="核心功能" name="features">
          <p class="help">每项功能可配置具体描述、操作流程和详细截图。</p>
          <div v-for="(f, i) in form.features" :key="i" class="feature">
            <div class="feature-top">
              <b>功能 {{ i + 1 }}</b>
              <el-button size="small" type="danger" @click="form.features.splice(i, 1)">删除</el-button>
            </div>
            <el-form label-width="100px">
              <el-form-item label="功能名称" required>
                <el-input v-model="f.name" />
              </el-form-item>
              <el-form-item label="功能描述" required>
                <el-input v-model="f.description" type="textarea" :rows="3" />
              </el-form-item>
              <el-form-item label="操作流程">
                <el-input v-model="f.steps" type="textarea" :rows="4" placeholder="每行一个步骤" />
              </el-form-item>
              <el-form-item label="功能截图" v-if="f.id">
                <el-upload :show-file-list="false" accept="image/*" multiple :http-request="(o) => uploadFeatureImage(o, f)">
                  <el-button size="small">上传截图</el-button>
                </el-upload>
                <div class="preview-list">
                  <div v-for="img in f.images || []" :key="img.id" class="preview-item">
                    <img :src="img.url" />
                    <el-button size="small" type="danger" @click="deleteFeatureImage(img.id, f)">删除</el-button>
                  </div>
                </div>
              </el-form-item>
            </el-form>
          </div>
          <el-button @click="form.features.push({ name: '', description: '', steps: '', images: [] })">＋ 添加核心功能</el-button>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api, { uploadFile } from '../api';

const route = useRoute();
const router = useRouter();
const isNew = computed(() => route.path.endsWith('/new'));
const projectId = ref(isNew.value ? null : Number(route.params.id));
const loading = ref(false);
const tab = ref('basic');
const categories = ['全部', 'Java', 'Python', '小程序', 'AI应用', '其他'];
const techInput = ref('');
const cover = ref(null);
const images = ref([]);
const video = ref(null);

const form = reactive({
  name: '',
  category: 'Java',
  level: '入门',
  summary: '',
  description: '',
  sort_order: 0,
  status: 'draft',
  features: [{ name: '', description: '', steps: '', images: [] }]
});

async function loadProject() {
  if (!projectId.value) return;
  loading.value = true;
  try {
    const p = await api.get(`/admin/projects/${projectId.value}`);
    Object.assign(form, {
      name: p.name,
      category: p.category,
      level: p.level,
      summary: p.summary,
      description: p.description,
      sort_order: p.sort_order,
      status: p.status,
      features: p.features?.length ? p.features : [{ name: '', description: '', steps: '', images: [] }]
    });
    techInput.value = (p.techs || []).join('、');
    cover.value = p.cover;
    images.value = p.images || [];
    video.value = p.video;
  } finally {
    loading.value = false;
  }
}

async function save(status) {
  if (!form.name.trim()) return ElMessage.warning('请填写项目名称');
  const payload = {
    ...form,
    status,
    tech_input: techInput.value,
    summary: form.summary || form.description.slice(0, 100)
  };
  loading.value = true;
  try {
    if (projectId.value) {
      await api.put(`/admin/projects/${projectId.value}`, payload);
      if (status === 'published') {
        await api.post(`/admin/projects/${projectId.value}/publish`);
      }
    } else {
      const created = await api.post('/admin/projects', payload);
      projectId.value = created.id;
      if (status === 'published') {
        await api.post(`/admin/projects/${projectId.value}/publish`);
      }
      router.replace(`/projects/${projectId.value}/edit`);
    }
    ElMessage.success(status === 'published' ? '项目已发布' : '草稿已保存');
    await loadProject();
  } finally {
    loading.value = false;
  }
}

async function uploadMedia({ file }, type) {
  const { url } = await uploadFile(file);
  const sort = type === 'image' ? images.value.length : 0;
  await api.post(`/admin/projects/${projectId.value}/media`, { type, url, sort_order: sort });
  ElMessage.success('上传成功');
  await loadProject();
}

async function deleteMedia(id) {
  await api.delete(`/admin/media/${id}`);
  ElMessage.success('已删除');
  await loadProject();
}

async function uploadFeatureImage({ file }, feature) {
  const { url } = await uploadFile(file);
  const sort = (feature.images || []).length;
  await api.post(`/admin/features/${feature.id}/images`, { url, sort_order: sort });
  ElMessage.success('截图已上传');
  await loadProject();
}

async function deleteFeatureImage(id, feature) {
  await api.delete(`/admin/feature-images/${id}`);
  feature.images = (feature.images || []).filter((x) => x.id !== id);
  ElMessage.success('已删除');
}

onMounted(loadProject);
</script>

<style scoped>
.heading { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.heading h1 { margin: 12px 0 0; font-size: 24px; }
.panel { background: #fff; border: 1px solid #e1e9f3; border-radius: 15px; padding: 22px; }
.help { color: #96a5ba; font-size: 12px; margin-top: 4px; }
.media-block { margin-bottom: 24px; }
.media-block h3 { margin: 0 0 12px; font-size: 15px; }
.req { color: #f56c6c; }
.preview { width: 200px; margin-top: 10px; border-radius: 8px; border: 1px solid #dce8f5; }
.video-preview { width: 100%; max-width: 480px; margin-top: 10px; border-radius: 8px; }
.preview-list { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
.preview-item img { width: 100px; height: 70px; object-fit: cover; border-radius: 8px; border: 1px solid #dce8f5; display: block; }
.feature { border: 1px solid #e1eaf5; border-radius: 12px; padding: 14px; margin-bottom: 12px; background: #fbfdff; }
.feature-top { display: flex; justify-content: space-between; margin-bottom: 10px; }
</style>
