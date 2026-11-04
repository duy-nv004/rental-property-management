import { test, expect } from '@playwright/test';

/**
 * E2E Phase 0: S2 (nút đăng xuất ở dashboard khách), A5 (hồ sơ admin), I9 (kỳ chưa có hóa đơn).
 * Mock toàn bộ API, không cần backend thật.
 */

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function login(page, role) {
  await page.addInitScript(([r]) => {
    if (sessionStorage.getItem('e2e-init')) return; // chỉ set phiên ở lần tải đầu
    sessionStorage.setItem('e2e-init', '1');
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', r);
    localStorage.setItem('username', `E2E ${r}`);
  }, [role]);
}

async function mockApi(page, handlers) {
  const calls = [];
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    const key = `${req.method()} ${path}`;
    if (req.method() !== 'GET') calls.push({ key, body: req.postDataJSON?.() ?? null });
    const handler = handlers[key];
    if (handler) return handler(route, req);
    return json(route, []);
  });
  return calls;
}

test('S2: khách chưa có hợp đồng bấm Đăng xuất thì xóa phiên và về /login', async ({ page }) => {
  await login(page, 'tenant');
  await mockApi(page, {
    'GET /tenant/summary': (r) => json(r, { hasActiveContract: false, hasPendingContract: false, profile: { name: 'Khách E2E', phone: '0900' } }),
  });
  await page.goto('/tenant/dashboard');
  await expect(page.getByText('Chưa có thông tin phòng thuê')).toBeVisible();
  await expect(page.getByRole('button', { name: /Quay lại trang Đăng nhập/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBeNull();
});

test('A5: admin bấm avatar mở trang hồ sơ và đổi mật khẩu', async ({ page }) => {
  await login(page, 'admin');
  const calls = await mockApi(page, {
    'GET /admin/stats': (r) => json(r, {}),
    'PUT /auth/change-password': (r) => json(r, { message: 'Đổi mật khẩu thành công!' }),
  });
  await page.goto('/admin/tickets');
  await page.getByRole('button', { name: 'Hồ sơ cá nhân' }).click();
  await expect(page).toHaveURL(/\/admin\/profile/);

  await page.getByLabel('Mật khẩu hiện tại').fill('admin');
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('admin123');
  await page.getByLabel('Xác nhận mật khẩu mới').fill('admin123');
  await page.getByRole('button', { name: /Đổi mật khẩu/ }).click();

  await expect.poll(() => calls.find(c => c.key === 'PUT /auth/change-password')?.body)
    .toEqual({ currentPassword: 'admin', newPassword: 'admin123' });
});

test('A5: mật khẩu mới dưới 6 ký tự bị chặn ở form', async ({ page }) => {
  await login(page, 'admin');
  const calls = await mockApi(page, {});
  await page.goto('/admin/profile');
  await page.getByLabel('Mật khẩu hiện tại').fill('admin');
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('123');
  await page.getByLabel('Xác nhận mật khẩu mới').fill('123');
  await page.getByRole('button', { name: /Đổi mật khẩu/ }).click();
  await expect(page.getByText('Mật khẩu mới phải có ít nhất 6 ký tự')).toBeVisible();
  expect(calls.filter(c => c.key === 'PUT /auth/change-password')).toHaveLength(0);
});

test('I9: kỳ chưa có hóa đơn không báo "đã thanh toán hết"', async ({ page }) => {
  await login(page, 'landlord');
  await mockApi(page, {
    'GET /invoices/status': (r) => json(r, { stats: { totalExpected: 0, totalCollected: 0, unpaidAmount: 0, unpaidRooms: 0, invoiceCount: 0 } }),
  });
  await page.goto('/landlord/dashboard');
  await expect(page.getByText('Chưa có hóa đơn nào cho kỳ này').first()).toBeVisible();
  await expect(page.getByText('Tất cả hóa đơn trong kỳ này đã được thanh toán.')).toHaveCount(0);
});

test('I9: kỳ có hóa đơn đã trả hết vẫn báo "Không có nợ đọng"', async ({ page }) => {
  await login(page, 'landlord');
  await mockApi(page, {
    'GET /invoices/status': (r) => json(r, { stats: { totalExpected: 100, totalCollected: 100, unpaidAmount: 0, unpaidRooms: 0, invoiceCount: 1 } }),
  });
  await page.goto('/landlord/dashboard');
  await expect(page.getByText('Không có nợ đọng')).toBeVisible();
});
