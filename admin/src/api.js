import axios from 'axios';
import { ElMessage } from 'element-plus';
import router from './router';

const api = axios.create({ baseURL: '/api', timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.message || '请求失败';
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      router.push('/login');
    }
    ElMessage.error(msg);
    return Promise.reject(err);
  }
);

export default api;

export function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

export function previewImportDocx(file) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/admin/import/preview', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}

export function importDocx(file) {
  const form = new FormData();
  form.append('file', file);
  return api.post('/admin/import/docx', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  });
}
