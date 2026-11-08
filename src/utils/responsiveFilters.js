/**
 * Các hàm tiện ích hỗ trợ bộ lọc đáp ứng (Responsive Filters)
 * Dùng để tính toán số lượng tiêu chí đang áp dụng, kiểm tra trạng thái lọc,
 * và hiển thị nhãn tóm tắt khi hiển thị trên màn hình điện thoại.
 */

/**
 * Kiểm tra xem một giá trị lọc có đang được áp dụng hay không.
 * Các giá trị không hợp lệ: null, undefined, '', 'all'
 * @param {*} value 
 * @returns {boolean}
 */
export function isFilterActive(value) {
  if (value === null || value === undefined || value === '' || value === 'all') {
    return false;
  }
  return true;
}

/**
 * Đếm số lượng bộ lọc đang được kích hoạt trong một object bộ lọc
 * @param {Record<string, any>} filters 
 * @returns {number}
 */
export function countActiveFilters(filters) {
  if (!filters || typeof filters !== 'object') {
    return 0;
  }
  let count = 0;
  for (const key of Object.keys(filters)) {
    if (isFilterActive(filters[key])) {
      count++;
    }
  }
  return count;
}

/**
 * Lấy danh sách tóm tắt các bộ lọc đang kích hoạt để người dùng dễ theo dõi
 * @param {Array<{ key: string, label: string, value: any, options?: Array<{ value: any, label: string }> }>} filterDefs 
 * @returns {Array<{ key: string, label: string, displayValue: string }>}
 */
export function formatActiveFilterSummary(filterDefs) {
  if (!Array.isArray(filterDefs)) return [];

  const summary = [];
  for (const item of filterDefs) {
    if (!item || !isFilterActive(item.value)) continue;

    let displayValue = String(item.value);
    if (Array.isArray(item.options)) {
      const match = item.options.find((opt) => opt.value === item.value);
      if (match && match.label) {
        displayValue = match.label;
      }
    }

    summary.push({
      key: item.key,
      label: item.label,
      displayValue
    });
  }
  return summary;
}

