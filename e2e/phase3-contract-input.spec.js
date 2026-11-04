import { test, expect } from '@playwright/test';

/**
 * E2E Phase 3: giá thuê chốt trong HĐ (I5) + trạng thái quá hạn / sắp hết hạn (C3).
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
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    const handler = handlers[`${req.method()} ${path}`];
    if (handler) return handler(route, req);
    return json(route, { message: 'E2E skip' }, 403);
  });
}

const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const building = { id: 1, name: 'Tòa A', address: '1 Đường E2E', totalFloors: 2, rooms: [] };
const tenant = { id: 7, name: 'Nguyễn Văn E2E', phone: '0900000000' };
const contractRow = (id, endDate, status = 'active') => ({
  id, roomId: 100 + id, tenantId: 7, status, deposit: 3000000, startDate: day(-300), endDate,
  tenant, room: { id: 100 + id, roomNumber: `10${id}`, price: 3000000, building },
});

test('C3: chủ nhà thấy Tag "Quá hạn" và "Sắp hết hạn" cho HĐ active', async ({ page }) => {
  await login(page, 'landlord');
  await mockApi(page, {
    'GET /contracts': (r) => json(r, [contractRow(1, day(-3)), contractRow(2, day(5)), contractRow(3, day(60))]),
    'GET /manage/rooms': (r) => json(r, []),
    'GET /manage/tenants': (r) => json(r, [tenant]),
    'GET /manage/buildings': (r) => json(r, [building]),
  });
  await page.goto('/landlord/contracts');
  const row = (n) => page.getByRole('row').filter({ hasText: `Phòng 10${n}` });
  await expect(row(1).getByText('Quá hạn')).toBeVisible();
  await expect(row(2).getByText('Sắp hết hạn')).toBeVisible();
  await expect(row(3).getByText('Đang hoạt động')).toBeVisible();
  await expect(row(3).getByText(/Quá hạn|Sắp hết hạn/)).toHaveCount(0);
});

test('I5: chọn phòng thì ô "Giá thuê/tháng" điền sẵn giá phòng', async ({ page }) => {
  await login(page, 'landlord');
  await mockApi(page, {
    'GET /contracts': (r) => json(r, []),
    'GET /manage/rooms': (r) => json(r, [{ id: 5, buildingId: 1, roomNumber: '105', price: 3200000, status: 'empty' }]),
    'GET /manage/tenants': (r) => json(r, [tenant]),
    'GET /manage/buildings': (r) => json(r, [building]),
  });
  await page.goto('/landlord/contracts');
  await page.getByRole('button', { name: /Lập hợp đồng mới/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Chọn Phòng trống').click();
  await page.locator('.ant-select-item-option').filter({ hasText: 'Phòng 105' }).click();
  await expect(dialog.getByLabel('Giá thuê/tháng (VND):')).toHaveValue('3,200,000');
});

test('I5 + C3: khách thấy giá thuê theo HĐ và Tag "Quá hạn"', async ({ page }) => {
  await login(page, 'tenant');
  await mockApi(page, {
    'GET /tenant/summary': (r) => json(r, {
      hasActiveContract: true, hasPendingContract: false, pendingContractIds: [],
      contracts: [{ id: 11, roomNumber: '101', buildingName: 'Tòa A', status: 'active' }],
      contract: { id: 11, status: 'active', rentPrice: '2500000.00', deposit: 3000000, startDate: day(-300), endDate: day(-2) },
      room: { roomNumber: '101', price: 3000000 },
      building: { name: 'Tòa A' },
      landlord: { name: 'Chủ nhà E2E', phone: '0911111111' },
      profile: tenant,
    }),
  });
  await page.goto('/tenant/contract');
  await expect(page.getByText(/2\.500\.000\s*₫\/tháng/)).toBeVisible();
  await expect(page.getByText(/3\.000\.000\s*₫\/tháng/)).toHaveCount(0);
  await expect(page.getByText('Quá hạn', { exact: true })).toBeVisible();
});
