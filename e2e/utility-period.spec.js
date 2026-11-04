import { test, expect } from '@playwright/test';

/**
 * E2E chọn kỳ chốt số điện nước. Từ ngày 1-5 mặc định là tháng trước
 * (chốt đầu tháng cho lượng dùng tháng trước), sau đó là tháng hiện tại.
 * Mock toàn bộ API, đặt đồng hồ trình duyệt cố định.
 */

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const tenant = { id: 7, name: 'Nguyễn Văn E2E', phone: '0900000000' };
const reading = (type, p, v) => ({ id: `${type}-${p}`, type, period: p, readingValue: v });
const room = {
  id: 101, roomNumber: '101', buildingId: 1, status: 'occupied', price: '2500000.00',
  contracts: [{ tenant }],
  readings: [reading('electricity', '2026-09', 100), reading('water', '2026-09', 10),
    reading('electricity', '2026-10', 150), reading('water', '2026-10', 14)],
  invoices: [{ id: 1, month: 10, year: 2026, isPaid: true }],
};

async function setup(page, isoDate) {
  await page.clock.setFixedTime(new Date(isoDate));
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', 'landlord');
    localStorage.setItem('username', 'E2E landlord');
  });
  const calls = [];
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    if (req.method() !== 'GET') calls.push({ key: `${req.method()} ${path}`, body: req.postDataJSON?.() ?? null });
    if (path === '/manage/buildings') return json(route, [{ id: 1, name: 'Tòa A' }]);
    if (path === '/manage/rooms') return json(route, [room]);
    if (path === '/invoices/generate') return json(route, { invoice: { id: 9, totalAmount: 1 } });
    return json(route, {});
  });
  await page.goto('/landlord/utilities');
  return calls;
}

test('ngày 03/11 mặc định kỳ 10/2026: phòng đã chốt tháng 10 hiện "Đã chốt"', async ({ page }) => {
  await setup(page, '2026-11-03T09:00:00');
  await expect(page.getByLabel('Kỳ chốt số')).toHaveValue('10/2026');
  const row = page.getByRole('row').filter({ hasText: 'P.101' });
  await expect(row).toContainText('Đã chốt');
  await expect(row).toContainText('100 → 150');
});

test('ngày 20/11 mặc định kỳ 11/2026; chốt gửi đúng kỳ', async ({ page }) => {
  const calls = await setup(page, '2026-11-20T09:00:00');
  await expect(page.getByLabel('Kỳ chốt số')).toHaveValue('11/2026');
  const row = page.getByRole('row').filter({ hasText: 'P.101' });
  await expect(row).toContainText('Số cũ: 150');

  await row.getByLabel('Chỉ số điện mới của phòng 101').fill('180');
  await row.getByLabel('Chỉ số nước mới của phòng 101').fill('18');
  await row.getByRole('button', { name: /Lưu & xuất HĐ/ }).click();

  await expect.poll(() => calls.find(c => c.key === 'POST /invoices/generate')?.body)
    .toEqual({ roomId: 101, month: 11, year: 2026 });
  expect(calls.find(c => c.key === 'POST /manage/meter-readings/sync').body.period).toBe('2026-11');
});

test('đổi kỳ bằng ô chọn tháng thì số cũ và trạng thái đổi theo', async ({ page }) => {
  await setup(page, '2026-11-20T09:00:00');
  const picker = page.getByLabel('Kỳ chốt số');
  await picker.click();
  await picker.fill('10/2026');
  await picker.press('Enter');
  const row = page.getByRole('row').filter({ hasText: 'P.101' });
  await expect(row).toContainText('Đã chốt');
});
