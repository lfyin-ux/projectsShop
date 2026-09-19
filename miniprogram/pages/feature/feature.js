const api = require('../../utils/api');
const { localizeItems } = require('../../utils/media');

Page({
  data: {
    feature: null,
    steps: []
  },

  onLoad(options) {
    this.loadFeature(options.id);
  },

  async loadFeature(id) {
    wx.showLoading({ title: '加载中' });
    try {
      const feature = await api.getFeature(id);
      feature.images = await localizeItems(
        (feature.images || []).map((img) => ({
          ...img,
          url: api.absUrl(img.url)
        }))
      );
      const steps = feature.steps_list || (feature.steps || '').split('\n').filter(Boolean);
      this.setData({ feature, steps });
    } catch (e) {
      console.error('加载功能详情失败', e);
      wx.showToast({ title: '功能不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    } finally {
      wx.hideLoading();
    }
  },

  goBack() {
    wx.navigateBack();
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.feature.images.map((i) => i.url).filter(Boolean);
    wx.previewImage({ current: url, urls });
  }
});
