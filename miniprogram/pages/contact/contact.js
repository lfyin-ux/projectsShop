const api = require('../../utils/api');
const { updateTabBar } = require('../../utils/tabbar');

Page({
  data: {
    visible: false,
    contact: {}
  },

  onShow() {
    updateTabBar(this, 2);
    this.loadConfig();
  },

  async loadConfig() {
    try {
      const config = await api.getSiteConfig();
      getApp().globalData.siteConfig = config;
      if (!config.show_contact) {
        updateTabBar(this, 0);
        wx.switchTab({ url: '/pages/index/index' });
        return;
      }
      this.setData({
        visible: true,
        contact: config.contact || {}
      });
      updateTabBar(this, 2);
    } catch (e) {
      console.error('加载联系方式失败', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  copyWechat() {
    const id = this.data.contact.wechat_id;
    if (!id) return wx.showToast({ title: '暂无微信号', icon: 'none' });
    wx.setClipboardData({
      data: id,
      success: () => wx.showToast({ title: '微信号已复制' })
    });
  }
});
