/**
 * Unit test cho logic thuần của màn xử lý sự cố (src/utils/supportRequests.js).
 * Chạy: npm test
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { sortSupportRequests, supportStats, filterSupportRequests } from './supportRequests.js';

const r = (id, status, severity, createdAt, extra = {}) => ({ id, status, severity, createdAt, ...extra });

describe('sortSupportRequests', () => {
  test('sự cố có thời gian mới hơn lên đầu, không bị đẩy xuống dưới khi trạng thái đã xong (resolved)', () => {
    const list = [
      r(1, 'pending', 'low', '2026-10-01'),
      r(2, 'in_progress', 'low', '2026-10-03'),
      r(3, 'resolved', 'high', '2026-10-05'),
    ];
    // Sự cố 3 (đã xong nhưng mới nhất 05/10) phải ở đầu, sau đó đến 2 (03/10), cuối cùng là 1 (01/10)
    assert.deepEqual(sortSupportRequests(list).map(x => x.id), [3, 2, 1]);
  });

  test('cùng thời gian tạo thì ưu tiên ID lớn hơn (mới tạo sau)', () => {
    const list = [
      r(1, 'pending', 'low', '2026-10-01'),
      r(5, 'resolved', 'high', '2026-10-01'),
      r(3, 'in_progress', 'medium', '2026-10-01'),
    ];
    assert.deepEqual(sortSupportRequests(list).map(x => x.id), [5, 3, 1]);
  });

  test('không làm thay đổi mảng gốc', () => {
    const list = [r(1, 'resolved', 'low', '2026-10-01'), r(2, 'pending', 'high', '2026-10-05')];
    sortSupportRequests(list);
    assert.deepEqual(list.map(x => x.id), [1, 2]);
  });
});

describe('supportStats', () => {
  test('đếm theo trạng thái và số sự cố nghiêm trọng chưa xong', () => {
    const list = [
      r(1, 'pending', 'high', 'x'),
      r(2, 'in_progress', 'high', 'x'),
      r(3, 'resolved', 'high', 'x'),
      r(4, 'pending', 'low', 'x'),
    ];
    assert.deepEqual(supportStats(list), { total: 4, pending: 2, inProgress: 1, resolved: 1, highOpen: 2 });
  });

  test('danh sách rỗng hoặc không phải mảng trả toàn 0', () => {
    const zero = { total: 0, pending: 0, inProgress: 0, resolved: 0, highOpen: 0 };
    assert.deepEqual(supportStats([]), zero);
    assert.deepEqual(supportStats(null), zero);
  });
});

describe('filterSupportRequests', () => {
  const list = [
    r(1, 'pending', 'high', 'x', {
      description: 'Ổ điện cháy', tenant: { name: 'Nguyễn Văn An', phone: '0901234567' },
      room: { roomNumber: '101', building: { id: 7, name: 'Sunshine' } },
    }),
    r(2, 'pending', 'low', 'x', {
      description: 'Vòi nước rò', tenant: { name: 'Trần Bình', phone: '0987654321' },
      room: { roomNumber: '202', building: { id: 8, name: 'Moonlight' } },
    }),
  ];

  test('không có điều kiện thì giữ nguyên', () => {
    assert.equal(filterSupportRequests(list, {}).length, 2);
  });

  test('tìm theo tên khách không phân biệt hoa thường và dấu', () => {
    assert.deepEqual(filterSupportRequests(list, { search: 'nguyen van' }).map(x => x.id), [1]);
  });

  test('tìm theo SĐT, số phòng hoặc mô tả', () => {
    assert.deepEqual(filterSupportRequests(list, { search: '0987' }).map(x => x.id), [2]);
    assert.deepEqual(filterSupportRequests(list, { search: '101' }).map(x => x.id), [1]);
    assert.deepEqual(filterSupportRequests(list, { search: 'vòi' }).map(x => x.id), [2]);
  });

  test('lọc theo tòa nhà', () => {
    assert.deepEqual(filterSupportRequests(list, { buildingId: 8 }).map(x => x.id), [2]);
  });

  test('lọc theo trạng thái, mức độ và loại sự cố', () => {
    assert.deepEqual(filterSupportRequests(list, { status: 'pending' }).map(x => x.id), [1, 2]);
    assert.deepEqual(filterSupportRequests(list, { severity: 'high' }).map(x => x.id), [1]);
    assert.deepEqual(filterSupportRequests(list, { severity: 'low' }).map(x => x.id), [2]);
    const listWithCat = [
      r(1, 'pending', 'high', 'x', { category: 'electric' }),
      r(2, 'resolved', 'low', 'x', { category: 'water' })
    ];
    assert.deepEqual(filterSupportRequests(listWithCat, { category: 'electric' }).map(x => x.id), [1]);
    assert.deepEqual(filterSupportRequests(listWithCat, { status: 'resolved' }).map(x => x.id), [2]);
  });

  test('bản ghi thiếu tenant/room không làm lỗi', () => {
    assert.deepEqual(filterSupportRequests([r(3, 'pending', 'low', 'x')], { search: 'abc' }), []);
  });
});
