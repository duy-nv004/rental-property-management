import { test, expect } from '@playwright/test';

/**
 * E2E Phase 1: A4 (giá gói lưu VND) và A3 (validate cấu hình gói, nhật ký).
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

const PLANS = [
  { id: 1, name: 'free', price: '0.00', annualPrice: '0.00', maxBuildings: 1, maxRoomsPerBuilding: 5, maxAICallsPerMonth: 0 },
  { id: 2, name: 'basic', price: '725000.00', annualPrice: '7250000.00', maxBuildings: 5, maxRoomsPerBuilding: 20, maxAICallsPerMonth: 30 },
  { id: 3, name: 'pro', price: '2475000.00', annualPrice: '24750000.00', maxBuildings: 9999, maxRoomsPerBuilding: 9999, maxAICallsPerMonth: -1 },
];

test('A4: trang gói của chủ nhà hiển thị giá VND, không nhân tỷ giá, không còn ký hiệu $', async ({ page }) => {
  await login(page, 'landlord');
  await mockApi(page, {
    'GET /auth/plans': (r) => json(r, PLANS),
    'GET /auth/profile': (r) => json(r, { id: 5, plan: 'free' }),
    'GET /sepay/config': (r) => json(r, { bankId: 'MB', bankAccount: '123', bankName: 'MB' }),
  });
  await page.goto('/landlord/plans');
  await expect(page.getByText(/^7\.250\.000\s*₫$/)).toBeVisible(); // mặc định chu kỳ năm
  await expect(page.getByText(/Tương đương 604\.167\s*₫\/tháng/)).toBeVisible();
  await expect(page.getByText(/\$\d/)).toHaveCount(0);
});

test('A4: dashboard admin hiển thị MRR bằng VND', async ({ page }) => {
  await login(page, 'admin');
  await mockApi(page, {
    'GET /admin/stats': (r) => json(r, {
      stats: { totalRevenue: 3200000, landlordCount: 2 },
      packages: { total: 2, free: 0, basic: 1, pro: 1 },
      recentActivity: [],
    }),
  });
  await page.goto('/admin/dashboard');
  await expect(page.getByText(/3\.200\.000\s*₫/)).toBeVisible();
});

test('A4 + A3: cấu hình gói ghi nhãn VND, khóa giá gói Free', async ({ page }) => {
  await login(page, 'admin');
  await mockApi(page, { 'GET /admin/plans': (r) => json(r, PLANS) });
  await page.goto('/admin/packages');
  await expect(page.getByLabel('Giá tháng (VND)')).toHaveCount(3);
  await expect(page.getByLabel('Giá tháng (USD)')).toHaveCount(0);
  await expect(page.getByLabel('Giá tháng (VND)').first()).toBeDisabled();
  await expect(page.getByLabel('Giá năm (VND)').first()).toBeDisabled();
  await expect(page.getByLabel('Giá tháng (VND)').nth(1)).toBeEnabled();
});

test('A3: nhật ký hiển thị nhãn "Cấu hình Gói cước"', async ({ page }) => {
  await login(page, 'admin');
  await mockApi(page, {
    'GET /admin/logs': (r) => json(r, { total: 1, page: 1, pageSize: 20, items: [{
      id: 1, action: 'UPDATE_PLAN_CONFIG', description: 'Admin cập nhật gói BASIC: price 725000→799000',
      createdAt: '2026-10-01T00:00:00Z', admin: { name: 'Admin', email: 'admin@gmail.com' },
    }] }),
  });
  await page.goto('/admin/logs');
  await expect(page.locator('table').getByText('Cấu hình Gói cước', { exact: true })).toBeVisible();
});
