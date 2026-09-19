Component({
  data: {
    selected: 0,
    showContact: true,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '项目',
        tabIndex: 0,
        icon: '/assets/tab-project.png',
        selectedIcon: '/assets/tab-project-active.png'
      },
      {
        pagePath: '/pages/about/about',
        text: '关于我',
        tabIndex: 1,
        icon: '/assets/tab-about.png',
        selectedIcon: '/assets/tab-about-active.png'
      },
      {
        pagePath: '/pages/contact/contact',
        text: '联系我',
        tabIndex: 2,
        needContact: true,
        icon: '/assets/tab-contact.png',
        selectedIcon: '/assets/tab-contact-active.png'
      }
    ]
  },
  methods: {
    switchTab(e) {
      const path = e.currentTarget.dataset.path;
      wx.switchTab({ url: path });
    }
  }
});
