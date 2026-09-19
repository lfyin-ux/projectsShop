App({
  globalData: {
    siteConfig: null
  },
  onLaunch() {
    this.loadSiteConfig();
  },
  async loadSiteConfig() {
    const api = require('./utils/api');
    try {
      this.globalData.siteConfig = await api.getSiteConfig();
    } catch (e) {
      console.error('加载站点配置失败', e);
    }
  }
});
