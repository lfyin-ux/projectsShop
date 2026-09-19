const api = require('../../utils/api');
const { localizeItems, localizeItem } = require('../../utils/media');

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

      let gallery = [];
      if (project.cover) {
        gallery.push({
          ...project.cover,
          url: api.absUrl(project.cover.url)
        });
      }
      for (const img of project.images || []) {
        gallery.push({ ...img, url: api.absUrl(img.url) });
      }
      gallery = await localizeItems(gallery);

      if (project.cover) {
        project.cover = await localizeItem({
          ...project.cover,
          url: api.absUrl(project.cover.url)
        });
      }
      if (project.video) {
        project.video = await localizeItem({
          ...project.video,
          url: api.absUrl(project.video.url)
        });
      }

      this.setData({ project, gallery, activeImage: 0 });
    } catch (e) {
      console.error('加载项目详情失败', e);
      wx.showToast({ title: '项目不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    } finally {
      wx.hideLoading();
    }
  },

  switchImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(index)) return;
    this.setData({ activeImage: index });
  },

  previewImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    const urls = this.data.gallery.map((g) => g.url).filter(Boolean);
    if (!urls.length) return;
    wx.previewImage({
      current: urls[index] || urls[0],
      urls
    });
  },

  goFeature(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) {
      wx.showToast({ title: '功能信息异常', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/feature/feature?id=${id}` });
  }
});
