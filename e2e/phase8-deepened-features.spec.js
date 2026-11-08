import { test, expect } from '@playwright/test';

/**
 * E2E Phase 8: Kiểm thử luồng các chức năng nâng cao (Mục 2, Mục 4, Mục 7)
 * Mock API với Vite dev server, đảm bảo độc lập và tin cậy.
 */

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function loginLandlord(page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-init')) return;
    sessionStorage.setItem('e2e-init', '1');
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', 'landlord');
    localStorage.setItem('username', 'Chủ Nhà Test');
  });
}

test.describe('Mục 2: Báo cáo tài chính & Lợi nhuận ròng (Financials)', () => {
  test.beforeEach(async ({ page }) => {
    await loginLandlord(page);
    await page.route('**/api/**', (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^.*\/api/, '');

      if (path === '/manage/buildings') {
        return json(route, [{ id: 1, name: 'Tòa Nhà Test Sunshine' }]);
      }

      if (path.startsWith('/invoices/status')) {
        return json(route, {
          stats: {
            totalExpected: 25000000,
            totalCollected: 20000000,
            unpaidAmount: 5000000,
            unpaidRooms: 2,
            totalRepairCost: 3000000,
            netProfit: 17000000,
            occupancyRate: 90,
            trend12Months: [
              { month: 1, label: 'T1', expected: 25000000, collected: 20000000, repairCost: 3000000, profit: 17000000 },
              { month: 2, label: 'T2', expected: 25000000, collected: 21000000, repairCost: 1000000, profit: 20000000 },
              { month: 3, label: 'T3', expected: 25000000, collected: 20000000, repairCost: 2000000, profit: 18000000 }
            ]
          }
        });
      }

      return json(route, []);
    });
  });

  test('Hiển thị đầy đủ 6 thẻ thống kê tài chính và biểu đồ biến động 12 tháng', async ({ page }) => {
    await page.goto('/landlord/financials');

    // Kiểm tra 6 thẻ StatCards qua .stat-label
    await expect(page.locator('.stat-label', { hasText: 'Tổng doanh thu kỳ vọng' })).toBeVisible();
    await expect(page.locator('.stat-label', { hasText: 'Đã thu thực tế' })).toBeVisible();
    await expect(page.locator('.stat-label', { hasText: 'Tiền phòng nợ đọng' })).toBeVisible();
    await expect(page.locator('.stat-label', { hasText: 'Chi phí sửa chữa/bảo dưỡng' })).toBeVisible();
    await expect(page.locator('.stat-label', { hasText: 'Lợi nhuận ròng (Net Profit)' })).toBeVisible();
    await expect(page.locator('.stat-label', { hasText: 'Tỷ lệ lấp đầy phòng' })).toBeVisible();

    // Giá trị hiển thị đúng
    await expect(page.getByText('17.000.000')).toBeVisible(); // Lợi nhuận ròng
    await expect(page.getByText('3.000.000')).toBeVisible();  // Chi phí bảo dưỡng
    await expect(page.getByText('90%')).toBeVisible();        // Tỷ lệ lấp đầy

    // Biểu đồ xu hướng 12 tháng
    await expect(page.getByText(/Xu hướng doanh thu & lợi nhuận 12 tháng/i)).toBeVisible();
  });
});

test.describe('Mục 4: Phân bổ chi phí sửa chữa trong SupportManager', () => {
  const REQUESTS = [
    {
      id: 101,
      description: 'Hỏng vòi rửa chén',
      severity: 'low',
      status: 'in_progress',
      category: 'water',
      images: [],
      createdAt: '2026-11-01T08:00:00Z',
      tenant: { name: 'Nguyễn Văn A', phone: '0901234567' },
      room: { id: 1, roomNumber: '101', building: { id: 1, name: 'Sunshine' } },
      chargeToTenant: false,
      repairCost: 0
    },
    {
      id: 102,
      description: 'Làm vỡ cửa kính ban công',
      severity: 'medium',
      status: 'resolved',
      category: 'other',
      images: [],
      createdAt: '2026-10-25T08:00:00Z',
      tenant: { name: 'Trần Thị B', phone: '0987654321' },
      room: { id: 2, roomNumber: '202', building: { id: 1, name: 'Sunshine' } },
      chargeToTenant: true,
      repairCost: 350000,
      landlordResponse: 'Đã thay kính mới, chi phí cộng vào kỳ sau.'
    }
  ];

  test.beforeEach(async ({ page }) => {
    await loginLandlord(page);
    await page.route('**/api/**', (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^.*\/api/, '');

      if (path === '/manage/support-requests') {
        if (route.request().method() === 'GET') {
          return json(route, REQUESTS);
        }
      }
      if (path.match(/\/manage\/support-requests\/\d+$/) && route.request().method() === 'PUT') {
        return json(route, { success: true, message: 'Cập nhật thành công' });
      }
      return json(route, []);
    });
  });

  test('Hiển thị cột Chi phí xử lý với nhãn phân bổ và mở modal phân chia chi phí', async ({ page }) => {
    await page.goto('/landlord/support');

    // Kiểm tra cột và nhãn
    await expect(page.getByRole('columnheader', { name: /Chi phí xử lý/i })).toBeVisible();
    await expect(page.getByText('Phụ thu phòng')).toBeVisible();
    await expect(page.getByText(/350\.000/)).toBeVisible();

    // Mở modal hoàn thành cho yêu cầu in_progress (nút Xong)
    const completeBtn = page.getByRole('button', { name: /Xong|Hoàn thành sửa chữa/i }).first();
    await completeBtn.click();

    // Modal hiển thị
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Bên chi trả chi phí')).toBeVisible();
    await expect(page.getByText(/Chủ nhà thanh toán/i)).toBeVisible();
    await expect(page.getByText(/Phụ thu vào hóa đơn phòng tiếp theo/i)).toBeVisible();
  });
});

test.describe('Mục 7: Cảnh báo bất thường chỉ số điện nước (UtilityManagement)', () => {
  const ROOMS_DATA = [
    {
      id: 1,
      buildingId: 1,
      roomNumber: '101',
      status: 'occupied',
      price: 3500000,
      contracts: [{ tenant: { name: 'Nguyễn Văn A' } }],
      invoices: [],
      readings: [
        { type: 'electricity', period: '2026-10', readingValue: 400 },
        { type: 'electricity', period: '2026-09', readingValue: 300 },
        { type: 'electricity', period: '2026-08', readingValue: 200 },
        { type: 'water', period: '2026-10', readingValue: 30 },
        { type: 'water', period: '2026-09', readingValue: 20 },
        { type: 'water', period: '2026-08', readingValue: 10 }
      ]
    }
  ];

  test.beforeEach(async ({ page }) => {
    await loginLandlord(page);
    await page.route('**/api/**', (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^.*\/api/, '');

      if (path === '/manage/buildings') {
        return json(route, [{ id: 1, name: 'Tòa Sunshine' }]);
      }
      if (path === '/manage/rooms') {
        return json(route, ROOMS_DATA);
      }
      return json(route, []);
    });
  });

  test('Hiển thị badge bất thường khi nhập chỉ số vọt quá 150% và mở dialog xác nhận', async ({ page }) => {
    await page.goto('/landlord/utilities');

    await expect(page.getByText('Phòng 101')).toBeVisible();

    // Nhập chỉ số điện tăng đột biến: TB cũ = 100 kWh, chỉ số trước = 400.
    // Nhập 680 => used = 280 (> 150 kWh)
    const inputs = page.locator('.ant-input-number-input');
    const elecInput = inputs.first();
    await elecInput.fill('680');

    // Badge cảnh báo bất thường xuất hiện
    await expect(page.getByText(/Tăng \d+% so với TB/)).toBeVisible();

    // Nhập chỉ số nước bình thường (35 -> used = 5)
    const waterInput = inputs.nth(1);
    await waterInput.fill('35');

    // Bấm nút "Xuất HĐ" của hàng phòng 101
    const saveBtn = page.getByRole('button', { name: 'Xuất HĐ' });
    await saveBtn.click();

    // Modal.confirm mở ra với cảnh báo tăng vọt
    await expect(page.locator('.ant-modal-confirm-title')).toBeVisible();
    await expect(page.locator('.ant-modal-confirm-title')).toContainText('Cảnh báo chỉ số tăng vọt');
    await expect(page.getByRole('button', { name: /Tiếp tục xuất HĐ/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Kiểm tra lại/i })).toBeVisible();
  });
});
