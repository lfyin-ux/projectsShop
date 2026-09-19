<template>
  <div>
    <div class="heading">
      <div>
        <h1>关于我</h1>
        <p>维护小程序「关于我」页面</p>
      </div>
    </div>
    <div class="panel">
      <el-form label-width="100px" style="max-width:700px">
        <el-form-item label="页面标题">
          <el-input v-model="form.title" placeholder="你好，我是项目创作者。" />
        </el-form-item>
        <el-form-item label="个人介绍">
          <el-input v-model="form.introduction" type="textarea" :rows="6" />
        </el-form-item>
        <el-form-item label="擅长方向">
          <el-input v-model="form.skills" placeholder="Web 全栈 / 微信小程序 / AI 应用" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="save">保存内容</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api';

const form = reactive({ title: '', introduction: '', skills: '' });

async function load() {
  const data = await api.get('/admin/profile');
  Object.assign(form, data);
}

async function save() {
  await api.put('/admin/profile', form);
  ElMessage.success('关于我已保存');
}

onMounted(load);
</script>

<style scoped>
.heading h1 { margin: 0; font-size: 24px; }
.heading p { margin: 4px 0 20px; color: #7c8da6; }
.panel { background: #fff; border: 1px solid #e1e9f3; border-radius: 15px; padding: 22px; }
</style>
