import { test, expect } from '@playwright/test';

/**
 * E2E T3.2: ContractManager có tìm kiếm, lọc tòa nhà/trạng thái (kèm Sắp hết hạn/Quá hạn),
 * duyệt/từ chối yêu cầu kèm lý do (responseNote), chi tiết HĐ không crash khi inventory hỏng,
 * và mục "Biên bản thanh lý" cho HĐ đã thanh lý.
 * Mock toàn bộ API, không cần backend thật.
 */

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

// Ngày tương đối so với hôm nay (YYYY-MM-DD) để khóa "Sắp hết hạn" ổn định
const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

async function loginLandlord(page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-init')) return;
    sessionStorage.setItem('e2e-init', '1');
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', 'landlord');
    localStorage.setItem('username', 'E2E landlord');
  });
}

const CONTRACTS = [
  {
    id: 1, status: 'active', startDate: dayOffset(-100), endDate: dayOffset(200), deposit: 3000000,
    inventory: '{oops', // JSON hỏng: modal chi tiết không được crash
    tenant: { name: 'Nguyễn Văn An', phone: '0901234567' },
    room: { roomNumber: '101', building: { id: 7, name: 'Sunshine' } },
  },
  {
    id: 2, status: 'terminated', startDate: dayOffset(-300), endDate: dayOffset(-10), deposit: 2000000,
    terminatedAt: dayOffset(-10), terminationNote: 'Khách trả phòng đúng hạn',
    tenant: { name: 'Trần Bình', phone: '0987654321' },
    room: { roomNumber: '202', building: { id: 8, name: 'Moonlight' } },
  },
  {
    id: 3, status: 'active', startDate: dayOffset(-200), endDate: dayOffset(3), deposit: 1000000,
    tenantName: 'Lê Cường', tenantPhone: '0911111111',
    room: { roomNumber: '301', building: { id: 7, name: 'Sunshine' } },
  },
];

const BUILDINGS = [{ id: 7, name: 'Sunshine' }, { id: 8, name: 'Moonlight' }];

const REQUESTS = [
  {
    id: 11, contractId: 1, type: 'renew', status: 'pending', desiredDate: dayOffset(300), note: 'Xin gia hạn',
    tenant: { name: 'Nguyễn Văn An' }, contract: { room: { roomNumber: '101' } },
  },
];

let putBodies;

test.beforeEach(async ({ page }) => {
  putBodies = [];
  await loginLandlord(page);
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    if (path === '/contracts' && req.method() === 'GET') return json(route, CONTRACTS);
    if (path === '/contracts/requests') return json(route, REQUESTS);
    if (/^\/contracts\/requests\/\d+$/.test(path) && req.method() === 'PUT') {
      putBodies.push(req.postDataJSON());
      return json(route, { message: 'Đã cập nhật yêu cầu' });
    }
    if (path === '/manage/buildings') return json(route, BUILDINGS);
    return json(route, []);
  });
  await page.goto('/landlord/contracts');
});

test('T3.2: tìm theo tên không dấu và lọc theo tòa nhà', async ({ page }) => {
  const rows = page.locator('.ant-table-tbody tr.ant-table-row');
  await expect(rows).toHaveCount(3);
  const search = page.getByPlaceholder('Tìm tên khách, SĐT, số phòng');
  await search.fill('nguyen van');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Nguyễn Văn An');

  await search.fill('');
  await page.getByTestId('contract-building-filter').click();
  await page.locator('.ant-select-item-option', { hasText: 'Moonlight' }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Trần Bình');
});

test('T3.2: lọc cột trạng thái theo "Sắp hết hạn"', async ({ page }) => {
  const rows = page.locator('.ant-table-tbody tr.ant-table-row');
  await page.getByTestId('contract-status-filter').click();
  await page.locator('.ant-select-item-option', { hasText: 'Sắp hết hạn' }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Phòng 301');
});

test('T3.2: từ chối yêu cầu phải nhập lý do và gửi responseNote', async ({ page }) => {
  await page.getByRole('button', { name: /Yêu cầu từ khách/ }).click();
  const drawer = page.locator('.ant-drawer');
  await drawer.getByRole('button', { name: 'Từ chối' }).click();

  const dialog = page.getByRole('dialog').filter({ hasText: 'Lý do' });
  await dialog.getByRole('textbox').fill('Phòng đã có người đặt');
  await dialog.getByRole('button', { name: /Xác nhận/ }).click();

  await expect.poll(() => putBodies.length).toBe(1);
  expect(putBodies[0]).toEqual({ status: 'rejected', responseNote: 'Phòng đã có người đặt' });
});

test('T3.2: xem HĐ có inventory hỏng không crash', async ({ page }) => {
  const rows = page.locator('.ant-table-tbody tr.ant-table-row');
  await rows.filter({ hasText: 'Nguyễn Văn An' }).getByRole('button', { name: /Xem HĐ/ }).click();
  const modal = page.getByRole('dialog').filter({ hasText: 'HỢP ĐỒNG CHO THUÊ PHÒNG TRỌ' });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Không bàn giao thiết bị đặc biệt nào kèm theo.');
});

test('T3.2: HĐ đã thanh lý có mục Biên bản thanh lý', async ({ page }) => {
  const rows = page.locator('.ant-table-tbody tr.ant-table-row');
  await rows.filter({ hasText: 'Trần Bình' }).getByRole('button', { name: /Xem HĐ/ }).click();
  const modal = page.getByRole('dialog').filter({ hasText: 'HỢP ĐỒNG CHO THUÊ PHÒNG TRỌ' });
  await expect(modal).toContainText('BIÊN BẢN THANH LÝ');
  await expect(modal).toContainText('Khách trả phòng đúng hạn');
});
