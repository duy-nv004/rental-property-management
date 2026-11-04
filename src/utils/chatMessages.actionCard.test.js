/**
 * Unit test cho logic thẻ xác nhận hành động (helpers mới trong chatMessages.js).
 * Chạy: npm test
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { actionCardLabels, formatActionSummary } from './chatMessages.js';

describe('actionCardLabels', () => {
  test('create_room có tiêu đề tiếng Việt', () => {
    const labels = actionCardLabels('create_room');
    assert.match(labels.title, /Tạo phòng/i);
  });

  test('tool lạ -> null (không hiện thẻ)', () => {
    assert.equal(actionCardLabels('delete_everything'), null);
    assert.equal(actionCardLabels(undefined), null);
  });
});

describe('formatActionSummary', () => {
  test('create_room liệt kê đúng các thông số có mặt', () => {
    const rows = formatActionSummary('create_room', {
      roomNumber: '101', price: 3500000, buildingId: 2, capacity: 3, area: 25,
    });
    assert.deepEqual(rows, [
      { label: 'Số phòng', value: '101' },
      { label: 'Giá thuê', value: '3.500.000 VND/tháng' },
      { label: 'Tòa nhà (ID)', value: '2' },
      { label: 'Sức chứa', value: '3 người' },
      { label: 'Diện tích', value: '25 m²' },
    ]);
  });

  test('tham số thiếu -> ẩn dòng, không hiện undefined', () => {
    const rows = formatActionSummary('create_room', { roomNumber: '102', price: 2000000 });
    assert.equal(rows.length, 2);
    assert.deepEqual(rows.map((r) => r.label), ['Số phòng', 'Giá thuê']);
  });

  test('tool lạ -> mảng rỗng', () => {
    assert.deepEqual(formatActionSummary('unknown', { a: 1 }), []);
  });
});

describe('tool mở rộng — nhãn và tóm tắt', () => {
  test('mọi tool đều có nhãn tiếng Việt', () => {
    for (const tool of ['create_room', 'update_room', 'delete_room', 'create_building', 'delete_building',
      'update_meter_readings', 'generate_invoice', 'update_invoice_payment',
      'cancel_contract', 'terminate_contract', 'update_support_status', 'create_support_request']) {
      const labels = actionCardLabels(tool);
      assert.ok(labels && labels.title, `thiếu nhãn cho ${tool}`);
    }
  });

  test('update_room: chỉ hiện thông số được truyền', () => {
    const rows = formatActionSummary('update_room', { roomId: 7, price: 4000000 });
    assert.deepEqual(rows, [
      { label: 'ID phòng', value: '7' },
      { label: 'Giá thuê mới', value: '4.000.000 VND/tháng' },
    ]);
  });

  test('delete_room / delete_building: hiện cảnh báo xóa', () => {
    const labels = actionCardLabels('delete_room');
    assert.match(labels.title, /Xóa/i);
    const rows = formatActionSummary('delete_room', { roomId: 7 });
    assert.deepEqual(rows, [{ label: 'ID phòng', value: '7' }]);
  });

  test('generate_invoice: hiện phòng + kỳ', () => {
    const rows = formatActionSummary('generate_invoice', { roomId: 7, month: 10, year: 2026 });
    assert.deepEqual(rows, [
      { label: 'ID phòng', value: '7' },
      { label: 'Kỳ hóa đơn', value: '10/2026' },
    ]);
  });

  test('update_meter_readings: hiện chỉ số điện/nước', () => {
    const rows = formatActionSummary('update_meter_readings', { roomId: 7, electricityValue: 10500, waterValue: 130 });
    assert.deepEqual(rows, [
      { label: 'ID phòng', value: '7' },
      { label: 'Chỉ số điện', value: '10.500 kWh' },
      { label: 'Chỉ số nước', value: '130 m³' },
    ]);
  });

  test('create_support_request: hiện mô tả + mức độ', () => {
    const rows = formatActionSummary('create_support_request', { description: 'Đèn hỏng', severity: 'high' });
    assert.deepEqual(rows, [
      { label: 'Mô tả', value: 'Đèn hỏng' },
      { label: 'Mức độ', value: 'Khẩn cấp' },
    ]);
  });

  test('update_invoice_payment: hiện trạng thái tiếng Việt', () => {
    const rows = formatActionSummary('update_invoice_payment', { invoiceId: 3, isPaid: true });
    assert.deepEqual(rows, [
      { label: 'ID hóa đơn', value: '3' },
      { label: 'Trạng thái', value: 'Đã thanh toán' },
    ]);
  });
});

describe('terminate_contract', () => {
  test('hiện chỉ số cuối, ngày trả phòng, hư hỏng và mất cọc', () => {
    const rows = formatActionSummary('terminate_contract', {
      contractId: 11, finalElectricity: 1250, finalWater: 88,
      terminationDate: '2026-10-31', damageAmount: 200000, forfeitDeposit: true,
    });
    assert.deepEqual(rows, [
      { label: 'ID hợp đồng', value: '11' },
      { label: 'Chỉ số điện cuối', value: '1.250 kWh' },
      { label: 'Chỉ số nước cuối', value: '88 m³' },
      { label: 'Ngày trả phòng', value: '2026-10-31' },
      { label: 'Tiền hư hỏng', value: '200.000 VND' },
      { label: 'Quyết toán cọc', value: 'Mất cọc' },
    ]);
  });

  test('chỉ có contractId: chỉ hiện ID hợp đồng', () => {
    assert.deepEqual(formatActionSummary('terminate_contract', { contractId: 11 }), [
      { label: 'ID hợp đồng', value: '11' },
    ]);
  });
});
