import { test, expect } from '@playwright/test';

/**
 * Đợt 1: nút "Đơn giá dịch vụ chung" ở danh sách tòa nhà phải lưu được.
 * Trước đây modal mở từ danh sách không set selectedBuilding nên modal không có
 * tên tòa nhà và handleUpdateService return sớm, không gọi PUT.
 * Mock toàn bộ API, không cần backend thật.
 */

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const building = {
  id: 1,
  name: 'Tòa E2E',
  address: '1 Đường E2E',
  createdAt: '2026-01-01',
  service: { electricityPrice: 3500, waterPrice: 20000, internetPrice: 100000, cleaningPrice: 50000 },
};

async function setup(page) {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', 'landlord');
    localStorage.setItem('username', 'E2E landlord');
  });
  const calls = [];
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    const key = `${req.method()} ${path}`;
    let body = null;
    if (req.method() !== 'GET') { try { body = req.postDataJSON(); } catch { body = req.postData(); } }
    calls.push({ key, body });
    if (key === 'GET /manage/buildings') return json(route, [building]);
    if (key === 'GET /manage/rooms') return json(route, []);
    if (key === 'PUT /manage/buildings/1/service') return json(route, { message: 'ok' });
    return json(route, []);
  });
  return calls;
}

test('lưu đơn giá dịch vụ từ danh sách tòa nhà gọi đúng PUT và đúng tòa nhà', async ({ page }) => {
  const calls = await setup(page);
  await page.goto('/landlord/buildings');

  await page.getByRole('button', { name: 'Đơn giá dịch vụ chung' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Tòa E2E');

  await dialog.getByLabel('Đơn giá Điện (VND/kWh)').fill('4000');
  await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();

  await expect(page.getByText('Đã cập nhật đơn giá dịch vụ tòa nhà!')).toBeVisible();
  const put = calls.find((c) => c.key === 'PUT /manage/buildings/1/service');
  expect(put, 'phải gọi PUT /manage/buildings/1/service').toBeTruthy();
  expect(put.body).toMatchObject({ electricityPrice: 4000, waterPrice: 20000 });
});
