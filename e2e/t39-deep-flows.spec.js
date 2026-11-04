import { test, expect } from '@playwright/test';

/**
 * E2E T3.9: Kiểm thử đầu-cuối (Playwright) cho 4 luồng nghiệp vụ sâu:
 * 1. Thanh lý hợp đồng (kể cả khi nợ vượt cọc allowDebt) & Khách thuê vẫn xem được HĐ Đã thanh lý kèm bảng quyết toán.
 * 2. Khách thuê nhiều phòng chọn phòng báo sự cố qua Web -> gửi đúng roomId và đồng bộ danh sách.
 * 3. Nâng cấp gói cước hiển thị banner pendingUpgrade, một nguồn số tiền duy nhất (pendingUpgrade.amount) trên QR và hủy yêu cầu.
 * 4. Chốt số điện nước kèm tùy chọn "Thay đồng hồ mới" (meterReset + resetReason) khi chỉ số mới nhỏ hơn chỉ số cũ.
 */

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function loginAs(page, role = 'landlord') {
  await page.addInitScript((r) => {
    if (sessionStorage.getItem('e2e-init')) return;
    sessionStorage.setItem('e2e-init', '1');
    localStorage.setItem('accessToken', `e2e-fake-token-${r}`);
    localStorage.setItem('role', r);
    localStorage.setItem('username', `E2E ${r}`);
    localStorage.setItem('user', JSON.stringify({ id: 1, username: `E2E ${r}`, role: r, plan: 'free' }));
  }, role);
}

test('T3.9.1: Chủ nhà thanh lý HĐ nợ vượt cọc (allowDebt) & Khách thuê xem bảng Quyết toán HĐ đã thanh lý', async ({ page }) => {
  await loginAs(page, 'landlord');
  const terminatePayloads = [];

  await page.route('**/api/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');

    if (path === '/contracts' && req.method() === 'GET') {
      return json(route, [
        {
          id: 1,
          status: 'active',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          deposit: 2000000,
          tenant: { name: 'Nguyễn Văn An', phone: '0901234567' },
          room: { roomNumber: '101', building: { id: 7, name: 'Sunshine' } },
        },
      ]);
    }
    if (path === '/contracts/requests') return json(route, []);
    if (path === '/manage/buildings') return json(route, [{ id: 7, name: 'Sunshine' }]);
    if (path === '/contracts/1/settlement-preview' && req.method() === 'POST') {
      return json(route, {
        held: 2000000,
        unpaidInvoices: [{ id: 50, month: 10, year: 2026, totalAmount: 3500000 }],
        finalInvoiceEstimate: null,
        damageAmount: 0,
        deduct: 2000000,
        refund: 0,
        outstandingAmount: 1500000,
        forfeit: false,
        needsReadings: false,
        blocked: true,
        blockMessage: 'Tổng khấu trừ vượt tiền cọc 1.500.000 ₫. Vui lòng thu thêm hoặc tích chọn ghi nợ khi thanh lý.',
      });
    }
    if (path === '/contracts/1/terminate' && req.method() === 'POST') {
      terminatePayloads.push(req.postDataJSON());
      return json(route, { message: 'Thanh lý hợp đồng thành công!' });
    }
    if (path === '/tenant/summary' && req.method() === 'GET') {
      return json(route, {
        contract: {
          id: 1,
          status: 'terminated',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          terminatedAt: '2026-11-03',
          rentPrice: 3000000,
          deposit: 2000000,
          finalElectricity: 150,
          finalWater: 20,
          outstandingAmount: 1500000,
          terminationNote: 'Đã cấn trừ cọc, còn nợ 1.5tr',
          deposits: [{ status: 'forfeited', amount: 2000000, refundedAmount: 0, deductedAmount: 2000000 }],
        },
        contracts: [
          { id: 1, roomId: 101, roomNumber: '101', buildingName: 'Sunshine', status: 'terminated' },
        ],
        room: { id: 101, roomNumber: '101', price: 3000000 },
        building: { id: 7, name: 'Sunshine', address: '123 Cầu Giấy' },
        landlord: { fullName: 'Chủ Nhà A', phone: '0988888888' },
        profile: { fullName: 'Nguyễn Văn An', phone: '0901234567' },
        hasActiveContract: false,
        hasPendingContract: false,
        pendingContractIds: [],
      });
    }
    if (path === '/tenant/requests') return json(route, []);
    return json(route, []);
  });

  await page.goto('/landlord/contracts');
  const row = page.locator('.ant-table-tbody tr.ant-table-row').first();
  await row.getByRole('button', { name: 'Thanh lý' }).click();

  const modal = page.getByRole('dialog', { name: /Thanh lý hợp đồng #1/ });
  const confirmBtn = modal.getByRole('button', { name: 'Xác nhận thanh lý' });
  await expect(confirmBtn).toBeDisabled();

  await modal.getByRole('button', { name: 'Tính quyết toán' }).click();
  await expect(modal.getByText('Công nợ còn thiếu sau cấn trừ')).toBeVisible();
  await expect(confirmBtn).toBeDisabled();

  await modal.getByLabel(/Thanh lý và ghi nợ phần còn thiếu/).check();
  await expect(confirmBtn).toBeEnabled();
  await confirmBtn.click();

  await expect.poll(() => terminatePayloads.length).toBe(1);
  expect(terminatePayloads[0].allowDebt).toBe(true);

  // Chuyển sang góc nhìn Khách thuê xem hợp đồng đã thanh lý
  await page.evaluate(() => {
    localStorage.setItem('role', 'tenant');
  });
  await page.goto('/tenant/contract');
  await expect(page.getByText('Quyết toán & Bàn giao phòng')).toBeVisible();
  await expect(page.getByText('150 kWh')).toBeVisible();
  await expect(page.getByText('20 m³')).toBeVisible();
  await expect(page.getByText('Đã cấn trừ cọc, còn nợ 1.5tr')).toBeVisible();
});

test('T3.9.2: Khách thuê có nhiều phòng chọn đúng phòng khi báo sự cố và đồng bộ danh sách', async ({ page }) => {
  await loginAs(page, 'tenant');
  let supportList = [];
  let submittedRoomId = null;

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');

    if (path === '/tenant/summary' && req.method() === 'GET') {
      return json(route, {
        contracts: [
          { id: 1, roomId: 101, roomNumber: '101', buildingName: 'Sunshine', status: 'active' },
          { id: 2, roomId: 202, roomNumber: '202', buildingName: 'Moonlight', status: 'active' },
        ],
      });
    }
    if (path === '/tenant/support' && req.method() === 'GET') {
      return json(route, supportList);
    }
    if (path === '/tenant/support' && req.method() === 'POST') {
      const bodyStr = req.postDataBuffer()?.toString('utf8') || '';
      const match = bodyStr.match(/name="roomId"\r\n\r\n(\d+)/);
      submittedRoomId = match ? Number(match[1]) : null;
      supportList = [
        {
          id: 99,
          description: 'Vòi nước bồn rửa bị rò rỉ',
          severity: 'high',
          category: 'water',
          status: 'pending',
          createdAt: new Date().toISOString(),
          room: { roomNumber: '202' },
        },
      ];
      return json(route, { message: 'Gửi sự cố thành công!' }, 201);
    }
    return json(route, []);
  });

  await page.goto('/tenant/support');
  await expect(page.getByText('Phòng gặp sự cố')).toBeVisible();

  await page.getByLabel('Phòng gặp sự cố').click();
  await page.locator('.ant-select-item-option', { hasText: 'Phòng 202 - Moonlight' }).click();

  await page.getByLabel('Mô tả sự cố').fill('Vòi nước bồn rửa bị rò rỉ');
  await page.getByRole('button', { name: 'Gửi yêu cầu hỗ trợ' }).click();

  await expect.poll(() => submittedRoomId).toBe(202);
  await expect(page.getByText('Vòi nước bồn rửa bị rò rỉ')).toBeVisible();
});

test('T3.9.3: Nâng cấp gói cước hiển thị một nguồn số tiền duy nhất từ pendingUpgrade.amount và cho phép hủy yêu cầu', async ({ page }) => {
  await loginAs(page, 'landlord');
  let cancelledId = null;

  const PLANS = [
    { id: 1, name: 'free', price: 0, annualPrice: 0, maxBuildings: 1, maxRoomsPerBuilding: 5, maxAIScansPerMonth: 0 },
    { id: 2, name: 'pro', price: 199000, annualPrice: 1910000, maxBuildings: 5, maxRoomsPerBuilding: 30, maxAIScansPerMonth: 200 },
  ];

  await page.route('**/api/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');

    if (path === '/auth/plans') return json(route, PLANS);
    if (path === '/auth/profile') {
      return json(route, {
        id: 1,
        username: 'landlord1',
        plan: 'free',
        pendingUpgrade: cancelledId
          ? null
          : {
              id: 88,
              planName: 'pro',
              billingCycle: 'annual',
              amount: 1910000,
              transferCode: 'NANGCAP88',
              status: 'pending',
              expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
            },
      });
    }
    if (path === '/sepay/config') {
      return json(route, { bankId: 'MB', bankAccount: '0123456789', bankName: 'MB Bank' });
    }
    if (path === '/auth/upgrade-request/88' && req.method() === 'DELETE') {
      cancelledId = 88;
      return json(route, { message: 'Đã hủy yêu cầu nâng cấp #88.' });
    }
    return json(route, []);
  });

  await page.goto('/landlord/plans');
  await expect(page.getByText(/Yêu cầu nâng cấp #88/)).toBeVisible();

  await page.getByRole('button', { name: 'Mở mã QR thanh toán' }).click();
  const modal = page.getByRole('dialog', { name: /Quét mã QR thanh toán gói cước/ });
  await expect(modal).toBeVisible();
  await expect(modal.getByText('1.910.000 ₫')).toBeVisible();

  const qrImg = modal.locator('img[alt^="Mã VietQR thanh toán"]');
  await expect(qrImg).toHaveAttribute('src', /amount=1910000/);
  await expect(qrImg).toHaveAttribute('src', /des=NANGCAP88/);

  await modal.getByRole('button', { name: /Hủy yêu cầu #88/ }).click();
  await expect.poll(() => cancelledId).toBe(88);
  await expect(page.getByText(/Yêu cầu nâng cấp #88/)).toHaveCount(0);
});

test('T3.9.4: Chốt số điện nước với tùy chọn Thay đồng hồ mới (meterReset + resetReason)', async ({ page }) => {
  await loginAs(page, 'landlord');
  const syncPayloads = [];

  await page.route('**/api/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');

    if (path === '/manage/buildings') return json(route, [{ id: 7, name: 'Sunshine' }]);
    if (path === '/manage/rooms') {
      return json(route, [
        {
          id: 101,
          buildingId: 7,
          roomNumber: '101',
          status: 'occupied',
          price: 3000000,
          contracts: [{ status: 'active', tenant: { fullName: 'Nguyễn Văn An' } }],
          readings: [
            { type: 'electricity', readingValue: 350, period: '2020-01' },
            { type: 'water', readingValue: 10, period: '2020-01' },
          ],
          invoices: [],
        },
      ]);
    }
    if (path === '/manage/meter-readings/sync' && req.method() === 'POST') {
      syncPayloads.push(req.postDataJSON());
      return json(route, { message: 'Đã đồng bộ chỉ số' });
    }
    if (path === '/invoices/generate' && req.method() === 'POST') {
      return json(route, {
        invoice: { id: 501, month: 11, year: 2026, roomPrice: 3000000, serviceFee: 100000, totalAmount: 3100000 },
        details: { electricity: { used: 25, cost: 87500 }, water: { used: 5, cost: 12500 } },
      });
    }
    return json(route, []);
  });

  await page.goto('/landlord/utilities');
  const row = page.locator('.ant-table-tbody tr.ant-table-row').first();

  // Tích chọn Thay đồng hồ mới cho cột chỉ số điện
  await row.getByRole('checkbox', { name: 'Thay đồng hồ mới' }).first().check();
  await page.getByLabel('Chỉ số điện mới của phòng 101').fill('25');
  await page.getByLabel('Lý do thay đồng hồ phòng 101').fill('Thay công tơ điện mới định kỳ');
  await page.getByLabel('Chỉ số nước mới của phòng 101').fill('15');

  await expect(row.getByText('Đồng hồ mới: dùng 25 kWh')).toBeVisible();

  await row.getByRole('button', { name: /Lưu & xuất HĐ/ }).click();

  await expect.poll(() => syncPayloads.length).toBe(1);
  expect(syncPayloads[0]).toMatchObject({
    roomId: 101,
    electricityValue: 25,
    waterValue: 15,
    electricityReset: true,
    waterReset: false,
    resetReason: 'Thay công tơ điện mới định kỳ',
  });
});
