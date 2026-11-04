import { test, expect } from '@playwright/test';

/**
 * E2E trang Chốt điện nước: phòng đã có hóa đơn kỳ hiện tại phải hiện "Đã chốt"
 * kèm số cũ -> số mới, không cho nhập/chốt lại. Mock toàn bộ API.
 */

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function login(page) {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', 'landlord');
    localStorage.setItem('username', 'E2E landlord');
  });
}

// Kỳ mặc định của trang: ngày 1-5 là kỳ tháng trước, sau đó là tháng hiện tại
const today = new Date();
const now = today.getDate() <= 5
  ? new Date(today.getFullYear(), today.getMonth() - 1, 1)
  : new Date(today.getFullYear(), today.getMonth(), 1);
const month = now.getMonth() + 1;
const year = now.getFullYear();
const period = `${year}-${String(month).padStart(2, '0')}`;
const prevDate = new Date(year, month - 2, 1);
const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

const tenant = { id: 7, name: 'Nguyễn Văn E2E', phone: '0900000000' };
const reading = (type, p, v) => ({ id: `${type}-${p}`, type, period: p, readingValue: v });
const baseRoom = { buildingId: 1, status: 'occupied', price: '2500000.00', contracts: [{ tenant }] };

const closedRoom = {
  ...baseRoom, id: 101, roomNumber: '101',
  readings: [reading('electricity', prevPeriod, 100), reading('water', prevPeriod, 10),
    reading('electricity', period, 150), reading('water', period, 14)],
  invoices: [{ id: 1, month, year, isPaid: true }],
};
const openRoom = {
  ...baseRoom, id: 102, roomNumber: '102',
  readings: [reading('electricity', prevPeriod, 200), reading('water', prevPeriod, 20)],
  invoices: [],
};

test('phòng đã chốt kỳ này hiện "Đã chốt" với số mới và khóa nút chốt', async ({ page }) => {
  await login(page);
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
    if (path === '/manage/buildings') return json(route, [{ id: 1, name: 'Tòa A' }]);
    if (path === '/manage/rooms') return json(route, [closedRoom, openRoom]);
    return json(route, []);
  });

  await page.goto('/landlord/utilities');
  const closedRow = page.getByRole('row').filter({ hasText: 'P.101' });
  const openRow = page.getByRole('row').filter({ hasText: 'P.102' });

  await expect(closedRow).toContainText('Đã chốt');
  await expect(closedRow).toContainText('100 → 150');
  await expect(closedRow).toContainText('10 → 14');
  await expect(closedRow.getByRole('button', { name: /Lưu & xuất HĐ/ })).toBeDisabled();
  await expect(closedRow.getByRole('spinbutton')).toHaveCount(0);

  // Phòng chưa chốt vẫn nhập và chốt bình thường
  await expect(openRow).toContainText('Số cũ: 200');
  await expect(openRow.getByRole('button', { name: /Lưu & xuất HĐ/ })).toBeEnabled();
});
