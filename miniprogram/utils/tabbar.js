function updateTabBar(page, selectedIndex) {
  if (typeof page.getTabBar !== 'function') return;
  const tabBar = page.getTabBar();
  if (!tabBar) return;
  const config = getApp().globalData.siteConfig;
  tabBar.setData({
    selected: selectedIndex,
    showContact: config ? !!config.show_contact : true
  });
}

module.exports = { updateTabBar };
