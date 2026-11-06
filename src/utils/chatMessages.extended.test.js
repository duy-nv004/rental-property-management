/**
 * Unit test mở rộng cho các tools mới và Scope Guardrails gợi ý của chatMessages.js
 * Chạy: npm test --prefix rental-property-management
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { actionCardLabels, formatActionSummary, suggestionsForRole, welcomeMessage } from './chatMessages.js';

describe('actionCardLabels cho tools mở rộng', () => {
  test('toàn bộ tools mới của Tenant, Landlord, Admin đều có tiêu đề tiếng Việt', () => {
    const newTools = [
      'request_move_out',
      'request_renewal',
      'add_roommate',
      'renew_contract_quick',
      'send_overdue_reminders',
      'get_revenue_stats',
      'resolve_landlord_ticket',
      'update_landlord_status',
    ];
    for (const tool of newTools) {
      const labels = actionCardLabels(tool);
      assert.ok(labels && labels.title, `thiếu nhãn tiêu đề cho tool ${tool}`);
    }
  });
});

describe('formatActionSummary cho tools mở rộng', () => {
  test('request_move_out: hiển thị ID hợp đồng, ngày mong muốn, lý do', () => {
    const rows = formatActionSummary('request_move_out', {
      contractId: 5, desiredDate: '2026-12-31', note: 'Chuyển công tác',
    });
    assert.deepEqual(rows, [
      { label: 'ID hợp đồng', value: '5' },
      { label: 'Ngày trả phòng mong muốn', value: '2026-12-31' },
      { label: 'Lý do / Ghi chú', value: 'Chuyển công tác' },
    ]);
  });

  test('request_renewal: hiển thị ID hợp đồng, ngày kết thúc mới', () => {
    const rows = formatActionSummary('request_renewal', {
      contractId: 5, desiredDate: '2027-12-31', note: 'Gia hạn 1 năm',
    });
    assert.deepEqual(rows, [
      { label: 'ID hợp đồng', value: '5' },
      { label: 'Ngày kết thúc mới', value: '2027-12-31' },
      { label: 'Ghi chú', value: 'Gia hạn 1 năm' },
    ]);
  });

  test('add_roommate: hiển thị tên người ở cùng, SĐT, quan hệ', () => {
    const rows = formatActionSummary('add_roommate', {
      contractId: 5, fullName: 'Lê Văn C', phone: '0912345678', relation: 'Đồng nghiệp',
    });
    assert.deepEqual(rows, [
      { label: 'ID hợp đồng', value: '5' },
      { label: 'Họ và tên người ở cùng', value: 'Lê Văn C' },
      { label: 'Số điện thoại', value: '0912345678' },
      { label: 'Quan hệ', value: 'Đồng nghiệp' },
    ]);
  });

  test('renew_contract_quick: hiển thị ngày bắt đầu, ngày kết thúc và giá mới', () => {
    const rows = formatActionSummary('renew_contract_quick', {
      contractId: 8, startDate: '2027-01-01', endDate: '2027-12-31', rentPrice: 4200000,
    });
    assert.deepEqual(rows, [
      { label: 'ID hợp đồng', value: '8' },
      { label: 'Ngày bắt đầu gia hạn', value: '2027-01-01' },
      { label: 'Ngày kết thúc gia hạn', value: '2027-12-31' },
      { label: 'Giá thuê mới', value: '4.200.000 VND/tháng' },
    ]);
  });

  test('get_revenue_stats: hiển thị kỳ thống kê theo tháng hoặc cả năm', () => {
    const monthRows = formatActionSummary('get_revenue_stats', { month: '10', year: 2026 });
    assert.deepEqual(monthRows, [
      { label: 'Kỳ thống kê', value: 'Tháng 10/2026' },
    ]);

    const yearRows = formatActionSummary('get_revenue_stats', { month: 'all', year: 2026 });
    assert.deepEqual(yearRows, [
      { label: 'Kỳ thống kê', value: 'Cả năm 2026' },
    ]);
  });

  test('resolve_landlord_ticket: hiển thị ticketId, trạng thái duyệt và phản hồi', () => {
    const rows = formatActionSummary('resolve_landlord_ticket', {
      ticketId: 14, status: 'resolved', adminResponse: 'Đã xác minh đầy đủ',
    });
    assert.deepEqual(rows, [
      { label: 'ID khiếu nại', value: '14' },
      { label: 'Trạng thái xử lý', value: 'Duyệt mở khóa' },
      { label: 'Phản hồi', value: 'Đã xác minh đầy đủ' },
    ]);
  });

  test('update_landlord_status: hiển thị landlordId, trạng thái và lý do khóa', () => {
    const rows = formatActionSummary('update_landlord_status', {
      landlordId: 9, status: 'locked', lockReason: 'Vi phạm điều khoản',
    });
    assert.deepEqual(rows, [
      { label: 'ID chủ nhà', value: '9' },
      { label: 'Trạng thái mới', value: 'Khóa tài khoản' },
      { label: 'Lý do khóa', value: 'Vi phạm điều khoản' },
    ]);
  });
});

describe('Scope Guardrails & Suggestions gợi ý năng lực', () => {
  test('mọi vai trò đều có nút gợi ý khám phá năng lực', () => {
    for (const role of ['admin', 'landlord', 'tenant']) {
      const suggestions = suggestionsForRole(role);
      assert.ok(suggestions.some((s) => s.includes('Bạn có thể làm được những gì') || s.includes('hỗ trợ những tác vụ gì') || s.includes('tính năng bạn có thể')));
    }
  });

  test('welcomeMessage thân thiện và đúng theo vai trò', () => {
    assert.match(welcomeMessage('admin'), /quản trị/i);
    assert.match(welcomeMessage('landlord'), /tòa nhà/i);
    assert.match(welcomeMessage('tenant'), /phòng đang thuê/i);
  });
});

