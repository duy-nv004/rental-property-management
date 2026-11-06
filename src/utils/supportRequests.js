/**
 * Logic thuần cho màn xử lý sự cố của chủ nhà (SupportManager).
 * Tách riêng để unit test bằng node:test.
 */

const STATUS_ORDER = { pending: 0, in_progress: 1, resolved: 2 };
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

const rank = (map, key) => (key in map ? map[key] : 99);

/** Bỏ dấu tiếng Việt + chữ thường để tìm kiếm. */
export const normalizeText = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();

/** Chờ xử lý → đang sửa → đã xong; cùng trạng thái thì nghiêm trọng trước, rồi mới nhất trước. */
export const sortSupportRequests = (list) =>
  [...(Array.isArray(list) ? list : [])].sort((a, b) =>
    rank(STATUS_ORDER, a.status) - rank(STATUS_ORDER, b.status)
    || rank(SEVERITY_ORDER, a.severity) - rank(SEVERITY_ORDER, b.severity)
    || new Date(b.createdAt) - new Date(a.createdAt));

export const supportStats = (list) => {
  const stats = { total: 0, pending: 0, inProgress: 0, resolved: 0, highOpen: 0 };
  if (!Array.isArray(list)) return stats;
  for (const r of list) {
    stats.total += 1;
    if (r.status === 'pending') stats.pending += 1;
    else if (r.status === 'in_progress') stats.inProgress += 1;
    else if (r.status === 'resolved') stats.resolved += 1;
    if (r.severity === 'high' && r.status !== 'resolved') stats.highOpen += 1;
  }
  return stats;
};

/** Lọc theo ô tìm kiếm (tên/SĐT khách, số phòng, mô tả), tòa nhà, trạng thái, mức độ và loại sự cố. */
export const filterSupportRequests = (list, { search, buildingId, status, severity, category } = {}) => {
  const q = normalizeText(search);
  return (Array.isArray(list) ? list : []).filter((r) => {
    if (buildingId != null && buildingId !== '' && r.room?.building?.id !== buildingId) return false;
    if (status && r.status !== status) return false;
    if (severity && r.severity !== severity) return false;
    if (category && (r.category || 'other') !== category) return false;
    if (!q) return true;
    const haystack = [r.tenant?.name, r.tenant?.phone, r.room?.roomNumber, r.description]
      .map(normalizeText)
      .join(' ');
    return haystack.includes(q);
  });
};
