export const PROJECT_CATEGORIES = [
  'Java',
  'Python',
  'MySQL',
  'Vue',
  '小程序',
  'Android',
  'AI应用',
  '其他'
];

export function parseCategories(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((s) => String(s).trim()).filter(Boolean))];
  }
  if (!value) return [];
  return [...new Set(
    String(value)
      .split(/[,，、|/]/)
      .map((s) => s.trim())
      .filter(Boolean)
  )];
}

export function serializeCategories(value) {
  const list = parseCategories(value).filter((c) => PROJECT_CATEGORIES.includes(c));
  return list.length ? list.join(',') : '其他';
}

export function matchCategoryFilter(stored, selected) {
  if (!selected || selected === '全部') return true;
  return parseCategories(stored).includes(selected);
}
