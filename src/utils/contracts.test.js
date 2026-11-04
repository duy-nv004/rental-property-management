/**
 * Unit test cho logic thuần của ContractManager (src/utils/contracts.js).
 * Chạy: npm test
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  contractFilterKeys, filterContracts, compareEndDate, parseInventory, contractStats,
  buildTerminationPayload, canConfirmTermination, computeMeterUsage, buildMeterSyncPayload,
} from './contracts.js';

const TODAY = new Date('2026-10-10T00:00:00');
const c = (id, status, endDate, extra = {}) => ({ id, status, startDate: '2026-01-01', endDate, ...extra });

describe('contractFilterKeys', () => {
  test('active còn xa hạn chỉ có khóa active', () => {
    assert.deepEqual(contractFilterKeys(c(1, 'active', '2027-01-01'), TODAY), ['active']);
  });
  test('active còn ≤ 7 ngày thêm khóa expiring', () => {
    assert.deepEqual(contractFilterKeys(c(1, 'active', '2026-10-15'), TODAY), ['active', 'expiring']);
  });
  test('active đã qua endDate thêm khóa overdue', () => {
    assert.deepEqual(contractFilterKeys(c(1, 'active', '2026-10-09'), TODAY), ['active', 'overdue']);
  });
  test('terminated không tính hạn', () => {
    assert.deepEqual(contractFilterKeys(c(1, 'terminated', '2026-10-09'), TODAY), ['terminated']);
  });
});

describe('filterContracts', () => {
  const list = [
    c(1, 'active', '2027-01-01', {
      tenant: { name: 'Nguyễn Văn An', phone: '0901234567' },
      room: { roomNumber: '101', building: { id: 7, name: 'Sunshine' } },
    }),
    c(2, 'terminated', '2026-09-01', {
      tenant: { name: 'Trần Bình', phone: '0987654321' },
      room: { roomNumber: '202', building: { id: 8, name: 'Moonlight' } },
    }),
    // HĐ có thông tin bên B riêng (tenantName/tenantPhone) và chưa gán tenant
    c(3, 'active', '2026-10-12', {
      tenantName: 'Lê Cường', tenantPhone: '0911111111',
      room: { roomNumber: '301', building: { id: 7, name: 'Sunshine' } },
    }),
  ];

  test('không điều kiện trả nguyên danh sách', () => {
    assert.deepEqual(filterContracts(list, {}, TODAY).map(x => x.id), [1, 2, 3]);
  });
  test('tìm tên không dấu', () => {
    assert.deepEqual(filterContracts(list, { search: 'nguyen van' }, TODAY).map(x => x.id), [1]);
  });
  test('tìm theo SĐT và số phòng', () => {
    assert.deepEqual(filterContracts(list, { search: '0987' }, TODAY).map(x => x.id), [2]);
    assert.deepEqual(filterContracts(list, { search: '301' }, TODAY).map(x => x.id), [3]);
  });
  test('tìm cả tenantName của bên B', () => {
    assert.deepEqual(filterContracts(list, { search: 'le cuong' }, TODAY).map(x => x.id), [3]);
  });
  test('lọc tòa nhà', () => {
    assert.deepEqual(filterContracts(list, { buildingId: 8 }, TODAY).map(x => x.id), [2]);
  });
  test('lọc trạng thái gồm khóa ảo expiring', () => {
    assert.deepEqual(filterContracts(list, { statuses: ['expiring'] }, TODAY).map(x => x.id), [3]);
    assert.deepEqual(filterContracts(list, { statuses: ['terminated', 'expiring'] }, TODAY).map(x => x.id), [2, 3]);
  });
  test('đầu vào không phải mảng trả mảng rỗng', () => {
    assert.deepEqual(filterContracts(null, {}, TODAY), []);
  });
});

describe('compareEndDate', () => {
  test('sắp xếp tăng dần theo endDate, thiếu endDate xuống cuối', () => {
    const list = [c(1, 'active', '2027-01-01'), c(2, 'active', null), c(3, 'active', '2026-11-01')];
    assert.deepEqual([...list].sort(compareEndDate).map(x => x.id), [3, 1, 2]);
  });
});

describe('parseInventory', () => {
  test('chuỗi JSON hợp lệ', () => {
    assert.deepEqual(parseInventory('[{"name":"Quạt","quantity":1}]'), [{ name: 'Quạt', quantity: 1 }]);
  });
  test('mảng có sẵn giữ nguyên', () => {
    const arr = [{ name: 'Giường' }];
    assert.deepEqual(parseInventory(arr), arr);
  });
  test('JSON hỏng không ném lỗi, trả mảng rỗng', () => {
    assert.deepEqual(parseInventory('{oops'), []);
  });
  test('JSON không phải mảng trả mảng rỗng', () => {
    assert.deepEqual(parseInventory('{"a":1}'), []);
    assert.deepEqual(parseInventory(null), []);
  });
});

describe('contractStats (T3.2)', () => {
  test('đếm theo trạng thái, gộp expiring/overdue vào active', () => {
    const list = [
      c(1, 'active', '2027-01-01'),
      c(2, 'active', '2026-10-15'), // expiring
      c(3, 'active', '2026-10-09'), // overdue
      c(4, 'active', '2026-10-12'), // expiring
      c(5, 'terminated', '2026-01-01'),
      c(6, 'pending_tenant_signature', '2027-01-01'),
    ];
    assert.deepEqual(contractStats(list, TODAY), { total: 6, active: 4, expiring: 2, overdue: 1, pending: 1, ended: 1 });
  });

  test('danh sách rỗng hoặc không phải mảng trả toàn 0', () => {
    const zero = { total: 0, active: 0, expiring: 0, overdue: 0, pending: 0, ended: 0 };
    assert.deepEqual(contractStats([], TODAY), zero);
    assert.deepEqual(contractStats(null, TODAY), zero);
  });
});

describe('T1.8 & T2.4: buildTerminationPayload, canConfirmTermination, computeMeterUsage, buildMeterSyncPayload', () => {
  test('T1.8: buildTerminationPayload truyền allowDebt và canConfirmTermination mở khóa nút khi allowDebt = true', () => {
    const payload = buildTerminationPayload({
      terminationDate: { format: () => '2026-11-30' },
      finalElectricity: 150,
      finalWater: 25,
      damageAmount: 100000,
      forfeit: false,
      allowDebt: true,
      note: 'Khách còn nợ',
    });
    assert.equal(payload.allowDebt, true);
    assert.equal(payload.terminationDate, '2026-11-30');
    assert.equal(canConfirmTermination({ blocked: true, outstandingAmount: 500000 }, false), false);
    assert.equal(canConfirmTermination({ blocked: true, outstandingAmount: 500000 }, true), true);
    assert.equal(canConfirmTermination({ blocked: false, outstandingAmount: 0 }, false), true);
    assert.equal(canConfirmTermination(null, true), false);
  });

  test('T2.4: computeMeterUsage và buildMeterSyncPayload hỗ trợ thay đồng hồ (meterReset)', () => {
    assert.equal(computeMeterUsage(120, 100, false), 20);
    assert.equal(computeMeterUsage(15, 100, false), null);
    assert.equal(computeMeterUsage(15, 100, true), 15);

    const syncBody = buildMeterSyncPayload(5, {
      electricity: 15,
      water: 30,
      electricityReset: true,
      waterReset: false,
      resetReason: 'Thay công tơ điện mới ngày 02/11',
    }, '2026-11');
    assert.deepEqual(syncBody, {
      roomId: 5,
      electricityValue: 15,
      waterValue: 30,
      period: '2026-11',
      electricityReset: true,
      waterReset: false,
      resetReason: 'Thay công tơ điện mới ngày 02/11',
    });
  });
});
