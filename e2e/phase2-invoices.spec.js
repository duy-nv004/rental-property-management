import { test, expect } from '@playwright/test';

/**
 * E2E Phase 2: I7 (chi tiết chỉ số/đơn giá trên hóa đơn khách) + hạn đóng tiền từ dueDate (I3).
 * Mock toàn bộ API, không cần backend thật.
 */

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function login(page, role) {
  await page.addInitScript(([r]) => {
    if (sessionStorage.getItem('e2e-init')) return;
    sessionStorage.setItem('e2e-init', '1');
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', r);
    localStorage.setItem('username', `E2E ${r}`);
  }, [role]);
}

async function mockApi(page, handlers) {
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    const handler = handlers[`${req.method()} ${path}`];
    if (handler) return handler(route, req);
    return json(route, []);
  });
}

const baseInvoice = {
  id: 11, month: 2, year: 2027, roomPrice: 3000000, electricityTotal: 175000, waterTotal: 80000,
  serviceTotal: 100000, totalAmount: 3355000, isPaid: false, createdAt: '2027-02-25T00:00:00Z',
  roomDetails: { id: 5, roomNumber: '101' },
};

test('I7: hóa đơn mới hiện chỉ số cũ → mới, tiêu thụ, đơn giá và hạn đóng tiền', async ({ page }) => {
  await login(page, 'tenant');
  await mockApi(page, {
    'GET /tenant/invoices': (r) => json(r, [{
      ...baseInvoice, dueDate: '2027-02-28',
      electricityOld: 100, electricityNew: 150, electricityPrice: '3500.00',
      waterOld: 10, waterNew: 14, waterPrice: '20000.00',
    }]),
  });
  await page.goto('/tenant/invoices');
  await page.getByRole('button', { name: /Chi tiết/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText(/100 → 150 = 50 kWh ×/)).toBeVisible();
  await expect(dialog.getByText(/10 → 14 = 4 m³ ×/)).toBeVisible();
  await expect(dialog.getByText(/28\/02\/2027/)).toBeVisible();
});

test('I7: hóa đơn cũ (không có chỉ số) giữ hiển thị như trước', async ({ page }) => {
  await login(page, 'tenant');
  await mockApi(page, { 'GET /tenant/invoices': (r) => json(r, [baseInvoice]) });
  await page.goto('/tenant/invoices');
  await page.getByRole('button', { name: /Chi tiết/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Tiền điện (Chỉ số chênh lệch)')).toBeVisible();
  await expect(dialog.getByText(/kWh/)).toHaveCount(0);
  await expect(dialog.getByText(/5 ngày kể từ khi hóa đơn được xuất/)).toBeVisible();
});
