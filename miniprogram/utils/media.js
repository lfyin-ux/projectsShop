/**
 * 本地开发时 API 返回 http://127.0.0.1 图片，新版基础库 wx-image 要求 HTTPS。
 * 通过 downloadFile 转为临时本地路径后再展示。
 */
function localizeUrl(url) {
  return new Promise((resolve) => {
    if (!url) return resolve('');
    if (url.startsWith('wxfile://') || url.startsWith('http://tmp/')) return resolve(url);

    wx.downloadFile({
      url,
      success(res) {
        resolve(res.statusCode === 200 ? res.tempFilePath : url);
      },
      fail() {
        resolve(url);
      }
    });
  });
}

async function localizeItem(item) {
  if (!item || !item.url) return item;
  const url = await localizeUrl(item.url);
  return { ...item, url };
}

async function localizeItems(items) {
  if (!items || !items.length) return [];
  const result = [];
  for (const item of items) {
    result.push(await localizeItem(item));
  }
  return result;
}

module.exports = { localizeUrl, localizeItem, localizeItems };
