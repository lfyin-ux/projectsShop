const api = require('../../utils/api');
const { updateTabBar } = require('../../utils/tabbar');

Page({
  data: {
    keyword: '',
    selected: '全部',
    categories: ['全部', 'Java', 'Python', '小程序', 'AI应用', '其他'],
    list: [],
    total: 0
  },

  onLoad() {
    this.loadProjects();
  },

  onShow() {
    updateTabBar(this, 0);
    this.syncSiteConfig();
  },

  onPullDownRefresh() {
    this.loadProjects().finally(() => wx.stopPullDownRefresh());
  },

  async syncSiteConfig() {
    try {
      const config = await api.getSiteConfig();
      getApp().globalData.siteConfig = config;
      updateTabBar(this, 0);
    } catch (e) {
      console.error('同步站点配置失败', e);
    }
  },

  async loadProjects() {
    wx.showLoading({ title: '加载中' });
    try {
      const { keyword, selected } = this.data;
      const res = await api.getProjects({
        keyword,
        category: selected === '全部' ? '' : selected
      });
      const list = (res.list || []).map((item) => ({
        ...item,
        cover_url: api.absUrl(item.cover_url)
      }));
      this.setData({ list, total: res.total || 0 });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onSearch(e) {
    this.setData({ keyword: e.detail.value }, () => this.loadProjects());
  },

  clearSearch() {
    this.setData({ keyword: '' }, () => this.loadProjects());
  },

  onFilter(e) {
    this.setData({ selected: e.currentTarget.dataset.category }, () => this.loadProjects());
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` });
  }
});
