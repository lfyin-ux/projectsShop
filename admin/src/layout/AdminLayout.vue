<template>
  <div class="app">
    <aside class="side">
      <div class="logo">PROJECT<b>/LAB</b></div>
      <small>工作台</small>
      <router-link v-for="item in nav" :key="item.path" :to="item.path" class="nav" active-class="active">
        {{ item.icon }}　{{ item.label }}
      </router-link>
      <small>设置</small>
      <router-link to="/contact" class="nav" active-class="active">✉　联系方式</router-link>
    </aside>
    <div class="main">
      <header class="top">
        <strong>{{ title }}</strong>
        <span class="user">{{ account }} · <a href="#" @click.prevent="logout">退出</a></span>
      </header>
      <div class="content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const account = localStorage.getItem('account') || '管理员';

const nav = [
  { path: '/dashboard', icon: '▦', label: '概览' },
  { path: '/projects', icon: '▤', label: '项目管理' },
  { path: '/profile', icon: '◉', label: '关于我' }
];

const titleMap = {
  dashboard: '概览',
  projects: '项目管理',
  profile: '关于我',
  contact: '联系方式'
};

const title = computed(() => {
  if (route.path.includes('/projects/')) return '项目编辑';
  const key = route.path.split('/')[1];
  return titleMap[key] || '管理后台';
});

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('account');
  router.push('/login');
}
</script>

<style scoped>
.app { display: flex; min-height: 100vh; }
.side {
  width: 228px; background: #fff; border-right: 1px solid #e1e9f3;
  padding: 25px 14px; position: sticky; top: 0; height: 100vh;
}
.logo { font-size: 19px; font-weight: 900; padding: 0 14px 25px; color: #24456e; }
.logo b { color: #417deb; }
.side small { display: block; padding: 12px 14px; color: #a1aec0; font-size: 11px; font-weight: 800; letter-spacing: .15em; }
.nav {
  display: block; width: 100%; text-align: left; background: transparent; border: 0;
  padding: 12px 15px; border-radius: 10px; color: #6e819e; margin: 2px 0; text-decoration: none;
}
.nav:hover, .nav.active { background: #edf5ff; color: #3474dd; font-weight: 700; }
.main { flex: 1; min-width: 0; }
.top {
  height: 70px; background: #fff; border-bottom: 1px solid #e1e9f3;
  display: flex; align-items: center; justify-content: space-between; padding: 0 32px;
}
.top strong { font-size: 18px; }
.user { color: #7f90a8; }
.user a { color: #417deb; text-decoration: none; }
.content { max-width: 1200px; margin: auto; padding: 28px 32px 80px; }
</style>
