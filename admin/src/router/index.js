import { createRouter, createWebHistory } from 'vue-router';
import Login from '../views/Login.vue';
import AdminLayout from '../layout/AdminLayout.vue';
import Dashboard from '../views/Dashboard.vue';
import Projects from '../views/Projects.vue';
import ProjectEditor from '../views/ProjectEditor.vue';
import Profile from '../views/Profile.vue';
import Contact from '../views/Contact.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login },
    {
      path: '/',
      component: AdminLayout,
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', component: Dashboard },
        { path: 'projects', component: Projects },
        { path: 'projects/new', component: ProjectEditor },
        { path: 'projects/:id/edit', component: ProjectEditor },
        { path: 'profile', component: Profile },
        { path: 'contact', component: Contact }
      ]
    }
  ]
});

router.beforeEach((to) => {
  const token = localStorage.getItem('token');
  if (to.path !== '/login' && !token) return '/login';
  if (to.path === '/login' && token) return '/dashboard';
});

export default router;
