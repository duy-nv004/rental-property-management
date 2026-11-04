import { test, expect } from '@playwright/test';

/**
 * E2E Phase 4: I1 (trang hóa đơn chủ nhà, xác nhận thu tiền) + I2 (tài khoản nhận tiền trong hồ sơ).
 * Mock toàn bộ API, không cần backend thật.
 */

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function login(page, role) {
  await page.addInitScript(([r]) => {
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', r);
    localStorage.setItem('username', `E2E ${r}`);
  }, [role]);
}

async function mockApi(page, handlers) {
  const calls = [];
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api/, '');
    const key = `${req.method()} ${path}`;
    calls.push({ key, query: url.search, body: req.method() !== 'GET' ? (req.postDataJSON?.() ?? null) : null });
    const handler = handlers[key];
    if (handler) return handler(route, req);
    return json(route, []);
  });
  return calls;
}

const invoice = (f) => ({
  id: 11, month: 2, year: 2026, totalAmount: 3355000, isPaid: false, dueDate: '2026-02-05', paymentMethod: null,
  roomPrice: 3000000, electricityTotal: 175000, waterTotal: 80000, serviceTotal: 100000,
  roomDetails: { id: 5, roomNumber: '101', building: { id: 1, name: 'Tòa A' } },
  tenant: { id: 7, name: 'Nguyễn Văn E2E' }, ...f,
});

test('I1: menu Hóa đơn -> danh sách -> xác nhận thu tiền mặt', async ({ page }) => {
  await login(page, 'landlord');
  let paid = false;
  const calls = await mockApi(page, {
    'GET /invoices': (r) => json(r, [paid ? invoice({ isPaid: true, paymentMethod: 'cash' }) : invoice()]),
    'POST /invoices/11/payment': (r) => { paid = true; return json(r, { message: 'Đã xác nhận thanh toán', isPaid: true }); },
  });

  await page.goto('/landlord/dashboard');
  await page.getByRole('menuitem', { name: 'Hóa đơn' }).click();
  await expect(page).toHaveURL(/\/landlord\/invoices/);

  const row = page.getByRole('row', { name: /101/ });
  await expect(row).toContainText('Tòa A');
  await expect(row).toContainText('Nguyễn Văn E2E');
  await expect(row).toContainText('05/02/2026');
  await expect(row).toContainText('Quá hạn');

  await row.getByRole('button', { name: 'Xác nhận đã thu' }).click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByLabel('Tiền mặt')).toBeChecked();
  await modal.getByRole('button', { name: 'Xác nhận' }).click();

  await expect(page.getByText('Đã xác nhận thanh toán')).toBeVisible();
  const post = calls.find((c) => c.key === 'POST /invoices/11/payment');
  expect(post.body).toEqual({ isPaid: true, paymentMethod: 'cash', paidAmount: 3355000 });
  await expect(page.getByRole('row', { name: /101/ })).toContainText('Đã thu');
});

test('I1: lọc Quá hạn gửi status=overdue; hóa đơn cấn cọc không có nút Hủy xác nhận', async ({ page }) => {
  await login(page, 'landlord');
  const calls = await mockApi(page, {
    'GET /invoices': (r) => json(r, [
      invoice({ id: 12, isPaid: true, paymentMethod: 'deposit', roomDetails: { roomNumber: '102', building: { name: 'Tòa A' } } }),
      invoice({ id: 13, isPaid: true, paymentMethod: 'cash', roomDetails: { roomNumber: '103', building: { name: 'Tòa A' } } }),
    ]),
  });

  await page.goto('/landlord/invoices?status=unpaid');
  await expect.poll(() => calls.filter((c) => c.key === 'GET /invoices').at(-1)?.query).toContain('status=unpaid');
  await page.getByText('Quá hạn', { exact: true }).first().click();
  await expect.poll(() => calls.filter((c) => c.key === 'GET /invoices').at(-1)?.query).toContain('status=overdue');

  await expect(page.getByRole('row', { name: /102/ }).getByRole('button', { name: 'Hủy xác nhận' })).toHaveCount(0);
  await expect(page.getByRole('row', { name: /103/ }).getByRole('button', { name: 'Hủy xác nhận' })).toBeVisible();
});

test('hồ sơ chủ nhà không còn phần cấu hình tài khoản nhận tiền', async ({ page }) => {
  await login(page, 'landlord');
  await mockApi(page, {
    'GET /auth/profile': (r) => json(r, { id: 1, name: 'Chủ E2E', email: 'a@b.c' }),
  });

  await page.goto('/landlord/profile');
  await expect(page.getByText('Thông tin cá nhân')).toBeVisible();
  await expect(page.getByText('Tài khoản nhận tiền phòng')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lưu tài khoản' })).toHaveCount(0);
});
