import { test, expect } from '@playwright/test';

/**
 * E2E Phase 5: A2 + A7 (khóa có lý do, mở khóa tùy chọn cấp mật khẩu),
 * A1 (xác nhận đổi gói), A6 (nhật ký phân trang + lọc phía server).
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
  const calls = [];
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api/, '');
    const key = `${req.method()} ${path}`;
    calls.push({ key, body: req.method() !== 'GET' ? (req.postDataJSON?.() ?? null) : null, query: Object.fromEntries(url.searchParams) });
    const handler = handlers[key];
    if (handler) return handler(route, req);
    return json(route, []);
  });
  return calls;
}

const LANDLORDS = [
  { id: 3, name: 'Chủ A', email: 'a@x.com', phone: '090', plan: 'FREE', portfolio: '1 Tòa nhà / 2 Phòng', date: '01/01/2026', status: 'ACTIVE', lockReason: null },
  { id: 4, name: 'Chủ B', email: 'b@x.com', phone: '091', plan: 'BASIC', portfolio: '1 Tòa nhà / 3 Phòng', date: '01/01/2026', status: 'LOCKED', lockReason: 'Nợ phí quá hạn' },
];

const landlordApi = (page) => mockApi(page, {
  'GET /admin/landlords': (r) => json(r, LANDLORDS),
  'PUT /admin/landlords/3/status': (r) => json(r, { message: 'ok' }),
  'PUT /admin/landlords/4/status': (r) => json(r, { message: 'ok' }),
  'PUT /admin/landlords/3/plan': (r) => json(r, { message: 'ok' }),
  'PUT /admin/landlords/4/plan': (r) => json(r, { message: 'ok' }),
});

const rowOf = (page, name) => page.locator('tr', { hasText: name });

test('A2: khóa chủ nhà bắt buộc nhập lý do, gửi kèm reason', async ({ page }) => {
  await login(page, 'admin');
  const calls = await landlordApi(page);
  await page.goto('/admin/landlords');
  await rowOf(page, 'Chủ A').getByRole('button', { name: 'Khóa' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(dialog.getByText('Vui lòng nhập lý do khóa (tối thiểu 5 ký tự)')).toBeVisible();
  expect(calls.filter(c => c.key === 'PUT /admin/landlords/3/status')).toHaveLength(0);
  await dialog.getByLabel('Lý do khóa').fill('Vi phạm điều khoản');
  await dialog.getByRole('button', { name: 'Xác nhận' }).click();
  await expect.poll(() => calls.find(c => c.key === 'PUT /admin/landlords/3/status')?.body)
    .toEqual({ status: 'locked', reason: 'Vi phạm điều khoản' });
});

test('A2: mở khóa mặc định không cấp mật khẩu; lý do khóa hiện ở tooltip', async ({ page }) => {
  await login(page, 'admin');
  const calls = await landlordApi(page);
  await page.goto('/admin/landlords');
  await rowOf(page, 'Chủ B').getByText('Bị khóa').hover();
  await expect(page.getByRole('tooltip').getByText(/Nợ phí quá hạn/)).toBeVisible();
  await rowOf(page, 'Chủ B').getByRole('button', { name: 'Mở khóa' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Cấp mật khẩu mới qua email')).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Xác nhận' }).click();
  await expect.poll(() => calls.find(c => c.key === 'PUT /admin/landlords/4/status')?.body)
    .toEqual({ status: 'active', resetPassword: false });
});

test('A1: đổi gói phải xác nhận; Hủy thì không gọi API', async ({ page }) => {
  await login(page, 'admin');
  const calls = await landlordApi(page);
  await page.goto('/admin/landlords');
  await rowOf(page, 'Chủ B').locator('.ant-select').click();
  await page.locator('.ant-select-dropdown:visible').getByText('Pro', { exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(page.getByRole('dialog', { name: 'Đổi gói của Chủ B từ BASIC sang PRO?' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Hủy' }).click();
  await expect(dialog).toHaveCount(0);
  expect(calls.filter(c => c.key === 'PUT /admin/landlords/4/plan')).toHaveLength(0);
  await expect(rowOf(page, 'Chủ B').locator('.ant-select')).toContainText('Basic');
});

test('A1: free lên gói trả phí chọn chu kỳ Năm, gửi billingCycle', async ({ page }) => {
  await login(page, 'admin');
  const calls = await landlordApi(page);
  await page.goto('/admin/landlords');
  await rowOf(page, 'Chủ A').locator('.ant-select').click();
  await page.locator('.ant-select-dropdown:visible').getByText('Basic', { exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Đây là cấp gói thủ công, không thu tiền')).toBeVisible();
  await dialog.getByText('Năm', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Xác nhận' }).click();
  await expect.poll(() => calls.find(c => c.key === 'PUT /admin/landlords/3/plan')?.body)
    .toEqual({ plan: 'BASIC', billingCycle: 'annual' });
});

test('A6: nhật ký phân trang phía server, lọc theo loại thì về trang 1', async ({ page }) => {
  await login(page, 'admin');
  const item = (id) => ({ id, action: 'LOCK_USER', description: `Log ${id}`, createdAt: '2026-10-01T00:00:00Z', admin: { name: 'Admin' } });
  const calls = await mockApi(page, {
    'GET /admin/logs': (r, req) => {
      const p = Number(new URL(req.url()).searchParams.get('page') || 1);
      return json(r, { items: [item(p * 100)], total: 45, page: p, pageSize: 20 });
    },
  });
  await page.goto('/admin/logs');
  await expect(page.getByText('45 bản ghi')).toBeVisible();
  await page.locator('.ant-pagination-item-2').click();
  await expect(page.getByText('Log 200')).toBeVisible();
  const logCalls = () => calls.filter(c => c.key === 'GET /admin/logs');
  expect(logCalls().at(-1).query).toMatchObject({ page: '2', pageSize: '20' });

  await page.getByLabel('Loại hành động').click();
  await page.locator('.ant-select-dropdown:visible').getByText('Khóa Tài khoản', { exact: true }).click();
  await expect.poll(() => logCalls().at(-1).query).toMatchObject({ page: '1', action: 'LOCK_USER' });

  await page.getByPlaceholder('Tìm theo mô tả').fill('BASIC');
  await page.getByPlaceholder('Tìm theo mô tả').press('Enter');
  await expect.poll(() => logCalls().at(-1).query).toMatchObject({ page: '1', action: 'LOCK_USER', q: 'BASIC' });
});
