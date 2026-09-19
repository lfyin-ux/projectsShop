<template>
  <div class="login-page">
    <div class="panel">
      <div class="logo">PROJECT<b>/LAB</b></div>
      <h1>管理后台登录</h1>
      <p>大学生全栈项目实训平台</p>
      <el-form @submit.prevent="submit">
        <el-form-item label="账号">
          <el-input v-model="form.account" placeholder="admin" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading" style="width:100%">登录</el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import api from '../api';

const router = useRouter();
const loading = ref(false);
const form = reactive({ account: 'admin', password: 'admin123' });

async function submit() {
  loading.value = true;
  try {
    const data = await api.post('/admin/login', form);
    localStorage.setItem('token', data.token);
    localStorage.setItem('account', data.account);
    ElMessage.success('登录成功');
    router.push('/dashboard');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh; display: grid; place-items: center;
  background: linear-gradient(180deg, #eef5ff, #f8fbff);
}
.panel {
  width: 380px; background: #fff; border: 1px solid #e1e9f3;
  border-radius: 16px; padding: 32px; box-shadow: 0 10px 40px #3d699014;
}
.logo { font-size: 22px; font-weight: 900; color: #24456e; margin-bottom: 8px; }
.logo b { color: #417deb; }
h1 { margin: 0 0 6px; font-size: 22px; }
p { color: #7c8da6; margin: 0 0 24px; }
</style>
