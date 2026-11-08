import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';

/**
 * E2E Phase 6: C4 (xóa/khóa khách thuê), C1 (thanh lý + quyết toán cọc),
 * C5 (yêu cầu trả phòng / gia hạn), C6 (người ở cùng & tạm trú).
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
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    const key = `${req.method()} ${path}`;
    // Body multipart (kèm ảnh CCCD) không parse được JSON -> giữ chuỗi thô
    let body = null;
    if (req.method() !== 'GET') { try { body = req.postDataJSON(); } catch { body = req.postData(); } }
    calls.push({ key, body });
    const handler = handlers[key];
    if (handler) return handler(route, req);
    return json(route, []);
  });
  return calls;
}

test.describe('C4: xóa khách thuê', () => {
  test('khách bị khóa hiện Tag Đã khóa, Popconfirm báo khóa thay vì xóa', async ({ page }) => {
    await login(page, 'landlord');
    const calls = await mockApi(page, {
      'GET /manage/tenants': (r) => json(r, [
        { id: 7, name: 'Khách Khóa', phone: '0900000001', status: 'locked', lockReason: 'Chủ nhà đã ngưng quản lý tài khoản', createdAt: '2026-01-01' },
        { id: 8, name: 'Khách Mới', phone: '0900000002', status: 'active', createdAt: '2026-01-01' },
      ]),
      'DELETE /manage/tenants/8': (r) => json(r, { message: 'Đã khóa tài khoản (giữ lịch sử hợp đồng/hóa đơn)' }),
    });
    await page.goto('/landlord/tenants');
    const lockedRow = page.getByRole('row', { name: /Khách Khóa/ });
    await expect(lockedRow.getByText('Đã khóa')).toBeVisible();
    await page.getByRole('button', { name: 'Xóa khách thuê Khách Mới' }).click();
    await expect(page.getByText(/Khách có lịch sử sẽ bị khóa thay vì xóa/)).toBeVisible();
    await page.getByRole('button', { name: 'Xóa', exact: true }).click();
    await expect(page.getByText('Đã khóa tài khoản (giữ lịch sử hợp đồng/hóa đơn)')).toBeVisible();
    expect(calls.some((c) => c.key === 'DELETE /manage/tenants/8')).toBe(true);
  });
});

const building = { id: 1, name: 'Tòa A', address: '1 Đường E2E', totalFloors: 2, rooms: [] };
const future = (days) => new Date(Date.now() + days * 86400000).toISOString();
const activeContract = {
  id: 11, roomId: 101, tenantId: 7, status: 'active', deposit: 3000000,
  startDate: future(-300), endDate: future(200),
  tenant: { id: 7, name: 'Nguyễn Văn E2E', phone: '0900000000' }, room: { id: 101, roomNumber: '101', building },
};
const contractPageMocks = (extra = {}) => ({
  'GET /contracts': (r) => json(r, [activeContract]),
  'GET /manage/rooms': (r) => json(r, []),
  'GET /manage/tenants': (r) => json(r, [activeContract.tenant]),
  'GET /manage/buildings': (r) => json(r, [building]),
  ...extra,
});

test.describe('C1: thanh lý hợp đồng', () => {
  test('chưa có hóa đơn tháng cuối: nhập chỉ số cuối, xem quyết toán, xác nhận thanh lý', async ({ page }) => {
    await login(page, 'landlord');
    const calls = await mockApi(page, contractPageMocks({
      'POST /contracts/11/settlement-preview': (r) => json(r, {
        held: 3000000, unpaidInvoices: [], unpaidTotal: 0, needsReadings: true, finalInvoice: null,
        finalInvoiceEstimate: 3170000, damageAmount: 0, deduct: 3170000, refund: 0, blocked: true,
        blockMessage: 'Công nợ 3.170.000 đ vượt tiền cọc 3.000.000 đ, yêu cầu khách thanh toán trước khi thanh lý',
      }),
    }));
    await page.goto('/landlord/contracts');
    await page.getByRole('button', { name: 'Thanh lý' }).click();
    const modal = page.getByRole('dialog');
    await expect(modal).toContainText('Thanh lý hợp đồng #11');
    await modal.getByLabel('Chỉ số điện cuối').fill('120');
    await modal.getByLabel('Chỉ số nước cuối').fill('15');
    await modal.getByRole('button', { name: 'Tính quyết toán' }).click();
    await expect(modal.getByText(/vượt tiền cọc/)).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Xác nhận thanh lý' })).toBeDisabled();
    const preview = calls.find((c) => c.key === 'POST /contracts/11/settlement-preview');
    expect(preview.body).toMatchObject({ finalElectricity: 120, finalWater: 15 });
    expect(preview.body.terminationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('đã có hóa đơn tháng cuối: không cần chỉ số, khấu trừ hư hỏng, gửi POST terminate', async ({ page }) => {
    await login(page, 'landlord');
    const calls = await mockApi(page, contractPageMocks({
      'POST /contracts/11/settlement-preview': (r) => json(r, {
        held: 3000000, unpaidInvoices: [{ id: 40, month: 11, year: 2026, totalAmount: 500000 }], unpaidTotal: 500000,
        needsReadings: false, finalInvoice: { id: 40, totalAmount: 500000, isPaid: false, electricityNew: 130, waterNew: 12 },
        finalInvoiceEstimate: null, damageAmount: 200000, deduct: 700000, refund: 2300000, blocked: false, blockMessage: null,
      }),
      'POST /contracts/11/terminate': (r) => json(r, { message: 'Thanh lý hợp đồng thành công và phòng trọ đã chuyển sang trạng thái Trống.' }),
    }));
    await page.goto('/landlord/contracts');
    await page.getByRole('button', { name: 'Thanh lý' }).click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Tiền hư hỏng').fill('200000');
    await modal.getByRole('button', { name: 'Tính quyết toán' }).click();
    await expect(modal).toContainText('Hóa đơn #40');
    await expect(modal).toContainText('2.300.000');
    await modal.getByRole('button', { name: 'Xác nhận thanh lý' }).click();
    await expect(page.getByText('Thanh lý hợp đồng thành công và phòng trọ đã chuyển sang trạng thái Trống.')).toBeVisible();
    const term = calls.find((c) => c.key === 'POST /contracts/11/terminate');
    expect(term.body).toMatchObject({ damageAmount: 200000, forfeit: false });
  });
});

const tenantSummary = () => ({
  hasActiveContract: true, hasPendingContract: false, pendingContractIds: [],
  contracts: [{ id: 11, roomNumber: '101', buildingName: 'Tòa A', status: 'active' }],
  contract: {
    id: 11, status: 'active', deposit: 3000000, startDate: future(-300), endDate: future(200),
    deposits: [{ amount: 3000000, status: 'held', refundedAmount: 0, deductedAmount: 0, note: null }],
  },
  room: { roomNumber: '101', price: 3000000 }, building: { name: 'Tòa A' },
  landlord: { name: 'Chủ nhà E2E', phone: '0911111111' }, profile: { id: 7, name: 'Khách' },
});

test.describe('C5: yêu cầu của khách', () => {
  test('khách báo trả phòng (mặc định cuối tháng), xem yêu cầu và tiền cọc', async ({ page }) => {
    await login(page, 'tenant');
    const calls = await mockApi(page, {
      'GET /tenant/summary': (r) => json(r, tenantSummary()),
      'GET /tenant/requests': (r) => json(r, [
        { id: 5, type: 'renewal', desiredDate: '2030-12-31', status: 'rejected', responseNote: 'Hết phòng', createdAt: '2026-10-01' },
      ]),
      'POST /tenant/contract/11/requests': (r) => json(r, { message: 'Đã gửi yêu cầu tới chủ nhà', request: { id: 6 } }, 201),
    });
    await page.goto('/tenant/contract');
    await page.getByRole('button', { name: /Yêu cầu của tôi/ }).click();
    await expect(page.getByRole('dialog').getByText('Hết phòng')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Đóng' }).click();

    await page.getByRole('button', { name: 'Báo trả phòng' }).click();
    const modal = page.getByRole('dialog');
    const endOfMonth = new Date(); endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
    const dd = String(endOfMonth.getDate()).padStart(2, '0');
    const mm = String(endOfMonth.getMonth() + 1).padStart(2, '0');
    await expect(modal.locator('.ant-picker-input input')).toHaveValue(`${dd}/${mm}/${endOfMonth.getFullYear()}`);
    await modal.getByRole('button', { name: 'Gửi yêu cầu' }).click();
    await expect(page.getByText('Đã gửi yêu cầu tới chủ nhà')).toBeVisible();
    const sent = calls.find((c) => c.key === 'POST /tenant/contract/11/requests');
    expect(sent.body).toMatchObject({ type: 'move_out', desiredDate: `${endOfMonth.getFullYear()}-${mm}-${dd}` });
  });

  test('chủ nhà thấy yêu cầu, cảnh báo báo trước < 30 ngày, duyệt trả phòng mở modal thanh lý', async ({ page }) => {
    await login(page, 'landlord');
    const calls = await mockApi(page, contractPageMocks({
      'GET /contracts/requests': (r) => json(r, [{
        id: 6, contractId: 11, type: 'move_out', desiredDate: '2026-11-30', status: 'pending', note: 'Chuyển việc',
        shortNotice: true, tenant: { name: 'Nguyễn Văn E2E' }, contract: { id: 11, room: { roomNumber: '101' } },
      }]),
      'PUT /contracts/requests/6': (r) => json(r, { message: 'Đã duyệt yêu cầu' }),
    }));
    await page.goto('/landlord/contracts');
    await page.getByRole('button', { name: /Yêu cầu từ khách/ }).click();
    const drawer = page.locator('.ant-drawer');
    await expect(drawer).toContainText('Chuyển việc');
    await expect(drawer).toContainText('Báo trước dưới 30 ngày');
    await drawer.getByRole('button', { name: 'Duyệt' }).click();
    await expect(page.getByRole('dialog', { name: /Thanh lý hợp đồng #11/ })).toBeVisible();
    await expect(page.getByRole('dialog', { name: /Thanh lý hợp đồng #11/ }).locator('.ant-picker-input input').first()).toHaveValue('30/11/2026');
    const put = calls.find((c) => c.key === 'PUT /contracts/requests/6');
    expect(put.body).toMatchObject({ status: 'approved' });
  });
});

// Chọn ảnh cho 2 ô CCCD (mặt trước, mặt sau) trong form người ở
const attachCccd = async (scope) => {
  const inputs = scope.locator('input[type="file"]');
  for (const [i, name] of [[0, 'front.png'], [1, 'back.png']]) {
    await inputs.nth(i).setInputFiles({ name, mimeType: 'image/png', buffer: Buffer.from('fake') });
  }
};

test.describe('C6: người ở cùng & tạm trú', () => {
  const occupants = [
    { id: 1, contractId: 11, fullName: 'Nguyễn Văn E2E', cccd: '001', isPrimary: true, residenceStatus: 'registered', registeredAt: '2026-01-05' },
    { id: 2, contractId: 11, fullName: 'Trần Thị B', cccd: '002', relation: 'Vợ', isPrimary: false, residenceStatus: 'not_registered' },
  ];

  test('chủ nhà xem người ở, thêm người, đánh dấu đã tạm trú', async ({ page }) => {
    await login(page, 'landlord');
    const calls = await mockApi(page, contractPageMocks({
      'GET /contracts/11/occupants': (r) => json(r, occupants),
      'POST /contracts/11/occupants': (r) => json(r, { message: 'Đã thêm người ở cùng' }),
      'PUT /contracts/occupants/2': (r) => json(r, { message: 'Đã cập nhật người ở' }),
    }));
    await page.goto('/landlord/contracts');
    await page.getByRole('button', { name: 'Người ở' }).click();
    const modal = page.getByRole('dialog', { name: /Người ở cùng/ });
    await expect(modal).toContainText('Trần Thị B');
    await expect(modal.getByRole('row', { name: /Trần Thị B/ })).toContainText('Chưa khai báo');
    await modal.getByRole('row', { name: /Trần Thị B/ }).getByRole('button', { name: 'Đánh dấu đã tạm trú' }).click();
    await expect(page.getByText('Đã cập nhật người ở')).toBeVisible();
    const put = calls.find((c) => c.key === 'PUT /contracts/occupants/2');
    expect(put.body.residenceStatus).toBe('registered');
    expect(put.body.registeredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await modal.getByLabel('Họ tên').fill('Lê Văn C');
    await modal.getByLabel('Quan hệ').fill('Bạn');
    await modal.getByRole('button', { name: 'Thêm người ở' }).click();
    // Thiếu ảnh CCCD thì form chặn, không gọi API
    await expect(modal.getByText('Tải ảnh CCCD mặt trước!')).toBeVisible();
    expect(calls.find((c) => c.key === 'POST /contracts/11/occupants')).toBeUndefined();
    await attachCccd(modal);
    await modal.getByRole('button', { name: 'Thêm người ở' }).click();
    await expect(page.getByText('Đã thêm người ở cùng')).toBeVisible();
    const post = calls.find((c) => c.key === 'POST /contracts/11/occupants').body;
    for (const s of ['Lê Văn C', 'Bạn', 'name="cccdFront"', 'name="cccdBack"']) expect(post).toContain(s);
  });

  test('danh sách khách thuê hiện số người đã tạm trú / tổng', async ({ page }) => {
    await login(page, 'landlord');
    await mockApi(page, {
      'GET /manage/tenants': (r) => json(r, [{ id: 7, name: 'Khách A', phone: '0900000001', status: 'active', createdAt: '2026-01-01',
        rentals: [{ id: 11, occupants: occupants.map(({ residenceStatus }) => ({ residenceStatus })) }] }]),
    });
    await page.goto('/landlord/tenants');
    await expect(page.getByRole('row', { name: /Khách A/ })).toContainText('1/2 đã khai báo');
  });

  test('khách xem người ở cùng trong hồ sơ và thêm người, không sửa được tạm trú', async ({ page }) => {
    await login(page, 'tenant');
    const calls = await mockApi(page, {
      'GET /tenant/summary': (r) => json(r, tenantSummary()),
      'GET /tenant/contract/11/occupants': (r) => json(r, occupants),
      'POST /tenant/contract/11/occupants': (r) => json(r, { message: 'Đã thêm người ở cùng' }, 201),
    });
    await page.goto('/tenant/profile');
    const card = page.locator('.ant-card', { hasText: 'Người ở cùng & tạm trú' });
    await expect(card).toContainText('Trần Thị B');
    await expect(card).toContainText('Đã khai báo');
    await expect(card.getByRole('button', { name: 'Đánh dấu đã tạm trú' })).toHaveCount(0);
    await card.getByRole('button', { name: 'Thêm người ở cùng' }).click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Họ tên').fill('Lê Văn C');
    await attachCccd(modal);
    await modal.getByRole('button', { name: 'Thêm' }).click();
    await expect(page.getByText('Đã thêm người ở cùng')).toBeVisible();
    const post = calls.find((c) => c.key === 'POST /tenant/contract/11/occupants').body;
    for (const s of ['Lê Văn C', 'name="cccdFront"', 'name="cccdBack"']) expect(post).toContain(s);
  });
});
