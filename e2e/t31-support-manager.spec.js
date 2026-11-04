import { test, expect } from '@playwright/test';

/**
 * E2E T3.1: SupportManager có thống kê, cột "Khách báo", ưu tiên chờ xử lý + nghiêm trọng, tìm kiếm và lọc.
 * Mock toàn bộ API, không cần backend thật.
 */

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function loginLandlord(page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-init')) return;
    sessionStorage.setItem('e2e-init', '1');
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', 'landlord');
    localStorage.setItem('username', 'E2E landlord');
  });
}

const REQUESTS = [
  {
    id: 1, description: 'Bóng đèn hỏng', severity: 'low', status: 'resolved', category: 'electric',
    images: [], createdAt: '2026-10-09T08:00:00Z',
    tenant: { name: 'Lê Cường', phone: '0911111111' },
    room: { roomNumber: '301', building: { id: 7, name: 'Sunshine' } },
  },
  {
    id: 2, description: 'Vòi nước rò', severity: 'low', status: 'pending', category: 'water',
    images: [], createdAt: '2026-10-08T08:00:00Z',
    tenant: { name: 'Trần Bình', phone: '0987654321' },
    room: { roomNumber: '202', building: { id: 8, name: 'Moonlight' } },
  },
  {
    id: 3, description: 'Ổ điện cháy', severity: 'high', status: 'pending', category: 'electric',
    images: [], createdAt: '2026-10-01T08:00:00Z',
    tenant: { name: 'Nguyễn Văn An', phone: '0901234567' },
    room: { roomNumber: '101', building: { id: 7, name: 'Sunshine' } },
  },
];

test.beforeEach(async ({ page }) => {
  await loginLandlord(page);
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
    if (path === '/manage/support-requests') return json(route, REQUESTS);
    return json(route, []);
  });
  await page.goto('/landlord/support');
});

test('T3.1: hàng thống kê đếm đúng theo trạng thái', async ({ page }) => {
  const stats = page.getByTestId('support-stats');
  await expect(stats.getByTestId('stat-pending')).toContainText('2');
  await expect(stats.getByTestId('stat-high-open')).toContainText('1');
  await expect(stats.getByTestId('stat-resolved')).toContainText('1');
});

test('T3.1: mặc định chờ xử lý + nghiêm trọng lên đầu, có cột Khách báo', async ({ page }) => {
  const rows = page.locator('.ant-table-tbody tr.ant-table-row');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Ổ điện cháy');
  await expect(rows.nth(1)).toContainText('Vòi nước rò');
  await expect(rows.nth(2)).toContainText('Bóng đèn hỏng');
  await expect(page.getByRole('columnheader', { name: 'Khách báo' })).toBeVisible();
  await expect(rows.nth(0)).toContainText('Nguyễn Văn An');
  await expect(rows.nth(0)).toContainText('0901234567');
});

test('T3.1: tìm theo tên không dấu và lọc theo tòa nhà', async ({ page }) => {
  const rows = page.locator('.ant-table-tbody tr.ant-table-row');
  const search = page.getByPlaceholder('Tìm tên khách, SĐT, số phòng, mô tả');
  await search.fill('nguyen van');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Ổ điện cháy');

  await search.fill('');
  await page.getByTestId('support-building-filter').click();
  await page.locator('.ant-select-item-option', { hasText: 'Moonlight' }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Vòi nước rò');
});

test('T3.1: lọc cột trạng thái chỉ còn sự cố đã khắc phục', async ({ page }) => {
  const rows = page.locator('.ant-table-tbody tr.ant-table-row');
  await page.getByRole('columnheader', { name: /Trạng thái/ }).locator('.ant-table-filter-trigger').click();
  const dropdown = page.locator('.ant-table-filter-dropdown');
  await dropdown.getByText('Đã khắc phục').click();
  await dropdown.getByRole('button', { name: /OK|Đồng ý/ }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Bóng đèn hỏng');
});
