<template>
  <div>
    <div class="heading">
      <div>
        <h1>联系方式</h1>
        <p>设置访客在「联系我」页面看到的信息</p>
      </div>
    </div>
    <div class="panel">
      <div class="switch-box">
        <el-checkbox v-model="showContact">
          在前台展示联系方式
        </el-checkbox>
        <p class="help">关闭后，前台隐藏「联系我」导航、联系页，以及其他页面中的联系引导文字。</p>
      </div>
      <el-form label-width="100px" style="max-width:700px">
        <el-form-item label="微信号">
          <el-input v-model="form.wechat_id" placeholder="填写你的微信号" />
        </el-form-item>
        <el-form-item label="联系页标题">
          <el-input v-model="form.title" placeholder="想进一步了解项目？" />
        </el-form-item>
        <el-form-item label="联系说明">
          <el-input v-model="form.description" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item>
          <el-button @click="preview">预览前台</el-button>
          <el-button type="primary" @click="save">保存内容</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api';

const showContact = ref(true);
const form = reactive({
  title: '',
  description: '',
  wechat_id: ''
});

async function load() {
  const data = await api.get('/admin/contact');
  Object.assign(form, data);
  showContact.value = Boolean(data.show_contact);
}

async function save() {
  await api.put('/admin/contact', {
    ...form,
    show_contact: showContact.value
  });
  ElMessage.success('联系方式设置已保存');
}

function preview() {
  window.open('../项目实战小程序交互原型.html', '_blank');
}

onMounted(load);
</script>

<style scoped>
.heading h1 { margin: 0; font-size: 24px; }
.heading p { margin: 4px 0 20px; color: #7c8da6; }
.panel { background: #fff; border: 1px solid #e1e9f3; border-radius: 15px; padding: 22px; }
.switch-box { padding: 14px; background: #f4f8ff; border: 1px solid #dce9fa; border-radius: 11px; margin-bottom: 20px; }
.help { color: #96a5ba; font-size: 12px; margin: 8px 0 0; }
</style>
