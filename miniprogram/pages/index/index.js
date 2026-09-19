const api = require('../../utils/api');
const { updateTabBar } = require('../../utils/tabbar');
const { localizeUrl } = require('../../utils/media');

Page({
  data: {
    keyword: '',
    selectedCategory: '全部',
    selectedLevel: '全部',
    categories: ['全部'],
    levels: ['全部'],
    list: [],
    total: 0
  },

  onLoad() {
    this.loadFilters();
    this.loadProjects();
  },

  onShow() {
    updateTabBar(this, 0);
    this.syncSiteConfig();
  },

  onPullDownRefresh() {
    Promise.all([this.loadFilters(), this.loadProjects()]).finally(() => wx.stopPullDownRefresh());
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

  async loadFilters() {
    try {
      const [categories, levels] = await Promise.all([
        api.getCategories(),
        api.getLevels()
      ]);
      this.setData({
        categories: categories.length ? categories : ['全部'],
        levels: levels.length ? levels : ['全部']
      });
    } catch (e) {
      console.error('加载筛选项失败', e);
    }
  },

  async loadProjects() {
    wx.showLoading({ title: '加载中' });
    try {
      const { keyword, selectedCategory, selectedLevel } = this.data;
      const res = await api.getProjects({
        keyword,
        category: selectedCategory === '全部' ? '' : selectedCategory,
        level: selectedLevel === '全部' ? '' : selectedLevel
      });
      const rawList = (res.list || []).map((item) => ({
        ...item,
        cover_url: api.absUrl(item.cover_url)
      }));
      const list = [];
      for (const item of rawList) {
        list.push({
          ...item,
          cover_url: item.cover_url ? await localizeUrl(item.cover_url) : ''
        });
      }
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
    const { type, value } = e.currentTarget.dataset;
    if (type === 'category') {
      this.setData({ selectedCategory: value }, () => this.loadProjects());
    } else if (type === 'level') {
      this.setData({ selectedLevel: value }, () => this.loadProjects());
    }
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` });
  }
});
