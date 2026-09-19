const { baseUrl } = require('./config');

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${url}`,
      method: options.method || 'GET',
      data: options.data,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data || { message: '请求失败' });
        }
      },
      fail: reject
    });
  });
}

function absUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return baseUrl.replace('/api', '') + url;
}

module.exports = {
  absUrl,
  getProjects(params) {
    return request('/public/projects', { data: params });
  },
  getProject(id) {
    return request(`/public/projects/${id}`);
  },
  getFeature(id) {
    return request(`/public/features/${id}`);
  },
  getSiteConfig() {
    return request('/public/site/config');
  },
  getCategories() {
    return request('/public/categories');
  }
};
