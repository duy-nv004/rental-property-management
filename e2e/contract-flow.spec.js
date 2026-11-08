import { test, expect } from '@playwright/test';

/**
 * E2E luồng hợp đồng: gia hạn (chủ nhà), trạng thái phòng, chọn phòng + từ chối ký (khách thuê).
 * Mock toàn bộ API để không phụ thuộc backend/MySQL thật.
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

// Một handler duy nhất phân luồng theo method + path, ghi lại các request ghi dữ liệu
async function mockApi(page, handlers) {
  const calls = [];
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    const key = `${req.method()} ${path}`;
    if (req.method() !== 'GET') calls.push({ key, body: req.postDataJSON?.() ?? null });
    const handler = handlers[key];
    if (handler) return handler(route, req);
    return json(route, { message: 'E2E skip' }, 403);
  });
  return calls;
}

const future = (days) => new Date(Date.now() + days * 86400000).toISOString();

const building = { id: 1, name: 'Tòa A', address: '1 Đường E2E', totalFloors: 2, rooms: [] };
const tenant = { id: 7, name: 'Nguyễn Văn E2E', phone: '0900000000' };

const activeContract = {
  id: 11, roomId: 101, tenantId: 7, status: 'active', deposit: 3000000, rentPrice: 2500000,
  startDate: future(-300), endDate: future(20),
  tenant, room: { id: 101, roomNumber: '101', building },
};

test.describe('Chủ nhà: gia hạn hợp đồng', () => {
  test('bấm Gia hạn -> chọn thời hạn -> gửi POST /contracts/:id/renew', async ({ page }) => {
    await login(page, 'landlord');
    const calls = await mockApi(page, {
      'GET /contracts': (r) => json(r, [activeContract]),
      'GET /manage/rooms': (r) => json(r, []),
      'GET /manage/tenants': (r) => json(r, [tenant]),
      'GET /manage/buildings': (r) => json(r, [building]),
      'POST /contracts/11/renew': (r) => json(r, { message: 'Đã tạo hợp đồng gia hạn, chờ khách thuê ký.' }),
    });

    await page.goto('/landlord/contracts');
    await page.getByRole('button', { name: /Gia hạn/ }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toContainText('Gia hạn hợp đồng #11');
    await expect(modal).toContainText('được chuyển sang hợp đồng mới');
    // Giá thuê sửa được trong modal nên câu mô tả không còn nói "giữ nguyên đơn giá"
    await expect(modal).toContainText('có thể đổi giá thuê');

    const inputs = modal.locator('.ant-picker-input input');
    await inputs.nth(0).click();
    await inputs.nth(0).fill('01/01/2030');
    await inputs.nth(0).press('Enter');
    await inputs.nth(1).fill('31/12/2030');
    await inputs.nth(1).press('Enter');

    const price = modal.getByLabel('Giá thuê mới (đ/tháng)');
    await expect(price).toHaveValue('2,500,000');
    await price.fill('2800000');

    await modal.getByRole('button', { name: 'Tạo hợp đồng gia hạn' }).click();

    await expect(page.getByText('Đã tạo hợp đồng gia hạn, chờ khách thuê ký.')).toBeVisible();
    const renew = calls.find((c) => c.key === 'POST /contracts/11/renew');
    expect(renew.body).toEqual({ startDate: '2030-01-01', endDate: '2030-12-31', rentPrice: 2800000 });
  });
});

test.describe('Chủ nhà: trạng thái phòng trong tòa nhà', () => {
  test('phòng chờ ký hiện "Chờ ký HĐ", phòng có HĐ sắp hết hạn có nút Gia hạn', async ({ page }) => {
    await login(page, 'landlord');
    const rooms = [
      { id: 101, buildingId: 1, roomNumber: '101', price: 3000000, status: 'occupied',
        contracts: [activeContract], invoices: [] },
      { id: 102, buildingId: 1, roomNumber: '102', price: 3000000, status: 'reserved',
        contracts: [{ id: 12, status: 'pending_tenant_signature', endDate: future(365) }], invoices: [] },
      { id: 103, buildingId: 1, roomNumber: '103', price: 3000000, status: 'empty', contracts: [], invoices: [] },
    ];
    await mockApi(page, {
      'GET /manage/buildings': (r) => json(r, [{ ...building, rooms }]),
      'GET /manage/rooms': (r) => json(r, rooms),
    });

    await page.goto('/landlord/buildings');
    await page.locator('.building-name', { hasText: 'Tòa A' }).click();

    const card = (n) => page.locator('.room-card', { hasText: `Phòng ${n}` });
    await expect(card('102')).toContainText('Chờ ký HĐ');
    await expect(card('102').getByRole('button', { name: /Xem hợp đồng/ })).toBeVisible();
    await expect(card('101').getByRole('button', { name: /Gia hạn/ })).toBeVisible();
    await expect(card('103').getByRole('button', { name: /Tạo hợp đồng/ })).toBeVisible();
  });
});

const summaryFor = (contractId) => {
  const contracts = [
    { id: 11, roomNumber: '101', buildingName: 'Tòa A', status: 'active' },
    { id: 21, roomNumber: '202', buildingName: 'Tòa A', status: 'pending_tenant_signature' },
  ];
  const isPending = contractId === 21;
  return {
    hasActiveContract: !isPending,
    hasPendingContract: true,
    pendingContractIds: [21],
    contracts,
    contract: { id: contractId, status: isPending ? 'pending_tenant_signature' : 'active',
      deposit: 3000000, startDate: future(-10), endDate: future(355) },
    room: { roomNumber: isPending ? '202' : '101', price: 3000000 },
    building: { name: 'Tòa A' },
    landlord: { name: 'Chủ nhà E2E', phone: '0911111111' },
    profile: tenant,
  };
};

test.describe('Khách thuê: nhiều hợp đồng', () => {
  test('chuyển sang hợp đồng chờ ký rồi từ chối -> gửi đúng id hợp đồng chờ ký', async ({ page }) => {
    await login(page, 'tenant');
    const calls = await mockApi(page, {
      'GET /tenant/summary': (r, req) => {
        const id = Number(new URL(req.url()).searchParams.get('contractId')) || 11;
        return json(r, summaryFor(id));
      },
      'POST /tenant/contract/21/reject': (r) => json(r, { message: 'ok' }),
    });

    await page.goto('/tenant/contract');
    await expect(page.getByText('Phòng 101')).toBeVisible();
    await expect(page.getByText('Bạn có hợp đồng khác đang chờ ký')).toBeVisible();

    await page.getByRole('button', { name: 'Xem hợp đồng chờ ký' }).click();
    await expect(page.getByText('Phòng 202')).toBeVisible();
    await expect(page.getByText('Hợp đồng đang chờ bạn ký nhận')).toBeVisible();

    await page.getByRole('button', { name: /^Từ chối$/ }).click();
    await page.getByRole('dialog').getByRole('textbox').fill('Sai đơn giá');
    await page.getByRole('button', { name: 'Xác nhận từ chối' }).click();

    await expect(page.getByText('Bạn đã từ chối ký hợp đồng.')).toBeVisible();
    const reject = calls.find((c) => c.key === 'POST /tenant/contract/21/reject');
    expect(reject.body).toEqual({ reason: 'Sai đơn giá' });
    expect(calls.some((c) => c.key === 'POST /tenant/contract/11/reject')).toBe(false);
  });
});

test.describe('Chủ nhà: duyệt yêu cầu gia hạn -> tạo hợp đồng gia hạn', () => {
  // MySQL trả DECIMAL dưới dạng chuỗi ("2500000.00"), nên giá thuê từ API là string
  const decimalContract = { ...activeContract, rentPrice: '2500000.00', deposit: '3000000.00' };
  const renewRequest = { id: 5, contractId: 11, tenantId: 7, type: 'renewal', status: 'pending', desiredDate: future(40), shortNotice: false, contract: decimalContract, tenant };

  test('giá thuê lấy từ DB (chuỗi DECIMAL) vẫn tạo được hợp đồng gia hạn', async ({ page }) => {
    await login(page, 'landlord');
    const calls = await mockApi(page, {
      'GET /contracts': (r) => json(r, [decimalContract]),
      'GET /contracts/requests': (r) => json(r, [renewRequest]),
      'PUT /contracts/requests/5': (r) => json(r, { message: 'Đã cập nhật yêu cầu' }),
      'GET /manage/rooms': (r) => json(r, []),
      'GET /manage/tenants': (r) => json(r, [tenant]),
      'GET /manage/buildings': (r) => json(r, [building]),
      'POST /contracts/11/renew': (r) => json(r, { message: 'Đã tạo hợp đồng gia hạn, chờ khách thuê ký.' }),
    });

    await page.goto('/landlord/contracts');
    await page.getByRole('button', { name: /Yêu cầu/ }).first().click();
    await page.getByRole('button', { name: 'Duyệt' }).first().click();

    const modal = page.getByRole('dialog').filter({ hasText: 'Gia hạn hợp đồng #11' });
    await expect(modal).toBeVisible();
    // Không được có lỗi "Giá thuê không được âm" khi giá là chuỗi số hợp lệ
    await expect(modal.getByText('Giá thuê không được âm')).toHaveCount(0);

    await modal.getByRole('button', { name: 'Tạo hợp đồng gia hạn' }).click();
    await expect(page.getByText('Đã tạo hợp đồng gia hạn, chờ khách thuê ký.')).toBeVisible();
    const renew = calls.find((c) => c.key === 'POST /contracts/11/renew');
    expect(renew.body.rentPrice).toBe(2500000);
  });
});
