const api = require('../../utils/api');

Page({
  data: {
    project: null,
    gallery: [],
    activeImage: 0
  },

  onLoad(options) {
    this.loadProject(options.id);
  },

  async loadProject(id) {
    wx.showLoading({ title: '加载中' });
    try {
      const project = await api.getProject(id);
      const gallery = (project.images || []).map((img) => ({
        ...img,
        url: api.absUrl(img.url)
      }));
      if (project.cover) {
        project.cover.url = api.absUrl(project.cover.url);
        if (!gallery.length) gallery.push(project.cover);
      }
      if (project.video) project.video.url = api.absUrl(project.video.url);
      this.setData({ project, gallery, activeImage: 0 });
    } catch (e) {
      wx.showToast({ title: '项目不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    } finally {
      wx.hideLoading();
    }
  },

  switchImage(e) {
    this.setData({ activeImage: Number(e.currentTarget.dataset.index) });
  },

  previewImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    wx.previewImage({
      current: this.data.gallery[index].url,
      urls: this.data.gallery.map((g) => g.url)
    });
  },

  goFeature(e) {
    wx.navigateTo({ url: `/pages/feature/feature?id=${e.currentTarget.dataset.id}` });
  }
});
