/**
 * Unit test Xuất CSV/Excel báo cáo tài chính, hóa đơn & HTML in PDF hợp đồng/hóa đơn.
 * Chạy: npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFinancialCsv,
  buildInvoicesCsv,
  buildPrintableContractHtml,
  buildPrintableInvoiceHtml,
} from './exportReport.js';

describe('exportReport utilities', () => {
  it('buildFinancialCsv tạo chuỗi CSV có UTF-8 BOM, tổng quan và bảng 12 tháng', () => {
    const csv = buildFinancialCsv({
      totalExpected: 15000000,
      totalCollected: 12000000,
      unpaidAmount: 3000000,
      totalRepairCost: 500000,
      netProfit: 11500000,
      occupancyRate: 80,
      trend12Months: [
        { month: 1, expected: 10000000, collected: 10000000, repairCost: 0, profit: 10000000 },
        { month: 2, expected: 15000000, collected: 12000000, repairCost: 500000, profit: 11500000 },
      ],
    }, 2026, 2);

    assert.ok(csv.startsWith('\uFEFF'), 'Phải có UTF-8 BOM để Excel mở tiếng Việt không lỗi font');
    assert.match(csv, /Tháng 2\/2026/);
    assert.match(csv, /15000000/);
    assert.match(csv, /11500000/);
    assert.match(csv, /Tháng 1,10000000,10000000,0,10000000/);
  });

  it('buildInvoicesCsv escape đúng dấu phẩy và ngoặc kép trong tên khách/tòa nhà', () => {
    const csv = buildInvoicesCsv([
      {
        id: 10,
        month: 11,
        year: 2026,
        roomDetails: { roomNumber: '101', building: { name: 'Nhà trọ "A, B"' } },
        tenant: { name: 'Nguyễn Văn, An' },
        roomPrice: 3000000,
        electricityTotal: 200000,
        waterTotal: 100000,
        serviceTotal: 150000,
        repairFee: 0,
        totalAmount: 3450000,
        paidAmount: 0,
        isPaid: false,
        dueDate: '2026-11-30',
      },
    ]);

    assert.ok(csv.startsWith('\uFEFF'));
    assert.match(csv, /"Nhà trọ ""A, B"""/);
    assert.match(csv, /"Nguyễn Văn, An"/);
    assert.match(csv, /3450000/);
  });

  it('buildPrintableContractHtml render đầy đủ thông tin hợp đồng, chữ ký và escape XSS', () => {
    const html = buildPrintableContractHtml({
      id: 42,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      rentPrice: 3500000,
      deposit: 3500000,
      electricityPrice: 3500,
      waterPrice: 20000,
      internetPrice: 100000,
      cleaningPrice: 50000,
      paymentDay: 5,
      tenantName: '<script>alert(1)</script>An',
      tenantPhone: '0901234567',
      tenantCccd: '079099000123',
      room: { roomNumber: '205', building: { name: 'Sunrise', address: '123 Lê Lợi' } },
      landlordSignature: 'data:image/png;base64,AAA',
      tenantSignature: 'data:image/png;base64,BBB',
    });

    assert.match(html, /HỢP ĐỒNG THUÊ PHÒNG/);
    assert.match(html, /205/);
    assert.match(html, /Sunrise/);
    assert.ok(!html.includes('<script>alert(1)</script>'), 'Phải escape HTML để chống XSS');
    assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(html.includes('data:image/png;base64,AAA'));
    assert.ok(html.includes('data:image/png;base64,BBB'));
  });

  it('buildPrintableInvoiceHtml render chi tiết chỉ số điện nước và tổng tiền hóa đơn', () => {
    const html = buildPrintableInvoiceHtml({
      id: 99,
      month: 11,
      year: 2026,
      dueDate: '2026-11-30',
      roomPrice: 3000000,
      electricityOld: 100,
      electricityNew: 150,
      electricityPrice: 3500,
      electricityTotal: 175000,
      waterOld: 10,
      waterNew: 14,
      waterPrice: 20000,
      waterTotal: 80000,
      serviceTotal: 150000,
      repairFee: 0,
      totalAmount: 3405000,
      isPaid: true,
      roomDetails: { roomNumber: '101', building: { name: 'Moonlight' } },
      tenant: { name: 'Trần Bình', phone: '0987654321' },
    });

    assert.match(html, /HÓA ĐƠN TIỀN PHÒNG/);
    assert.match(html, /11\/2026/);
    assert.match(html, /100/);
    assert.match(html, /150/);
    assert.match(html, /Đã thanh toán/);
  });
});
