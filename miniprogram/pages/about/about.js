const api = require('../../utils/api');
const { updateTabBar } = require('../../utils/tabbar');

Page({
  data: {
    profile: {},
    showContactLine: false
  },

  onShow() {
    updateTabBar(this, 1);
    this.loadConfig();
  },

  async loadConfig() {
    try {
      const config = await api.getSiteConfig();
      getApp().globalData.siteConfig = config;
      this.setData({
        profile: config.profile || {},
        showContactLine: !!config.show_contact
      });
      updateTabBar(this, 1);
    } catch (e) {
      console.error('加载关于我失败', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  }
});
