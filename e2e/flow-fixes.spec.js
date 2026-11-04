import { test, expect } from '@playwright/test';

/**
 * E2E sửa luồng demo: G1 polling thanh toán, G2 tài khoản bị khóa, G3 lưu user khi đăng ký,
 * G4 chatbot làm mới trang, G5 nhãn doanh thu ước tính, G6 mở khóa khách thuê. Mock toàn bộ API.
 */

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

// Chỉ seed phiên ở lần tải đầu, để kiểm tra được việc xóa phiên sau khi chuyển trang
async function login(page, role) {
  await page.addInitScript(([r]) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', r);
    localStorage.setItem('username', `E2E ${r}`);
    localStorage.setItem('user', JSON.stringify({ id: 1, role: r }));
  }, [role]);
}

async function mockApi(page, handlers) {
  const calls = [];
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api/, '');
    const key = `${req.method()} ${path}`;
    calls.push({ key, query: url.search, body: req.method() !== 'GET' ? (req.postDataJSON?.() ?? null) : null });
    const handler = handlers[key];
    if (handler) return handler(route, req);
    return json(route, []);
  });
  return calls;
}

const count = (calls, key) => calls.filter((c) => c.key === key).length;

const tenantInvoice = (f) => ({
  id: 21, month: 3, year: 2026, totalAmount: 3000000, isPaid: false, createdAt: '2026-03-01',
  qrCodeUrl: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', roomDetails: { id: 5, roomNumber: '101' }, ...f,
});

test('G1: mở QR -> polling 5s, hóa đơn đã trả thì đóng modal, báo thành công, làm mới', async ({ page }) => {
  await page.clock.install();
  await login(page, 'tenant');
  let paid = false;
  const calls = await mockApi(page, {
    'GET /tenant/invoices': (r) => json(r, [tenantInvoice({ isPaid: paid })]),
  });

  await page.goto('/tenant/invoices');
  await page.getByRole('button', { name: 'Thanh toán' }).click();
  const dialog = page.getByRole('dialog', { name: 'Quét mã VietQR chuyển khoản' });
  await expect(dialog).toBeVisible();
  const before = count(calls, 'GET /tenant/invoices');

  await page.clock.runFor(5000);
  await expect.poll(() => count(calls, 'GET /tenant/invoices')).toBeGreaterThan(before);
  await expect(dialog).toBeVisible();

  paid = true;
  await page.clock.runFor(5000);
  await expect(page.getByText('Hóa đơn đã được thanh toán thành công!')).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Đã đóng')).toBeVisible();

  // Modal đã đóng thì ngừng polling
  const after = count(calls, 'GET /tenant/invoices');
  await page.clock.runFor(15000);
  expect(count(calls, 'GET /tenant/invoices')).toBeLessThanOrEqual(after + 1);
});

test('G1: đóng modal QR thì tải lại danh sách', async ({ page }) => {
  await login(page, 'tenant');
  const calls = await mockApi(page, {
    'GET /tenant/invoices': (r) => json(r, [tenantInvoice()]),
  });
  await page.goto('/tenant/invoices');
  await page.getByRole('button', { name: 'Thanh toán' }).click();
  const before = count(calls, 'GET /tenant/invoices');
  await page.getByRole('button', { name: 'Quay lại' }).click();
  await expect.poll(() => count(calls, 'GET /tenant/invoices')).toBeGreaterThan(before);
});

test('G2: 403 ACCOUNT_LOCKED -> xóa phiên, về /login', async ({ page }) => {
  await login(page, 'tenant');
  await mockApi(page, {
    'GET /tenant/invoices': (r) => json(r, { code: 'ACCOUNT_LOCKED', message: 'Tài khoản của bạn đã bị khóa. Lý do: test' }, 403),
  });
  await page.goto('/tenant/invoices');
  await expect(page).toHaveURL(/\/login$/);
  const session = await page.evaluate(() => ['accessToken', 'role', 'username', 'user'].map((k) => localStorage.getItem(k)));
  expect(session).toEqual([null, null, null, null]);
});

test('G2: 403 thường (không phải khóa) không đăng xuất', async ({ page }) => {
  await login(page, 'tenant');
  await mockApi(page, {
    'GET /tenant/invoices': (r) => json(r, { message: 'Bạn không có quyền' }, 403),
  });
  await page.goto('/tenant/invoices');
  await expect(page.getByText('Hóa đơn của tôi')).toBeVisible();
  await expect(page).toHaveURL(/\/tenant\/invoices/);
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBe('e2e-fake-token');
});

async function fillRegister(page) {
  await page.goto('/register');
  await page.getByLabel('Họ và tên').fill('Chủ Mới');
  await page.getByLabel('Email').fill('moi@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('123456');
  await page.getByLabel('Xác nhận mật khẩu').fill('123456');
  await page.getByRole('button', { name: 'Đăng ký ngay' }).click();
  await expect(page).toHaveURL(/\/landlord\/dashboard/);
}

test('G3: đăng ký lưu localStorage user từ phản hồi', async ({ page }) => {
  await mockApi(page, {
    'POST /auth/register': (r) => json(r, {
      token: 't1', user: { id: 9, name: 'Chủ Mới', email: 'moi@example.com', role: 'landlord', plan: 'free' },
    }, 201),
  });
  await fillRegister(page);
  const user = JSON.parse(await page.evaluate(() => localStorage.getItem('user')));
  expect(user).toMatchObject({ id: 9, email: 'moi@example.com', role: 'landlord', plan: 'free' });
});

test('G3: phản hồi không có user thì lấy /auth/profile', async ({ page }) => {
  await mockApi(page, {
    'POST /auth/register': (r) => json(r, { token: 't1' }, 201),
    'GET /auth/profile': (r) => json(r, { id: 10, name: 'Chủ Mới', email: 'moi@example.com', role: 'landlord', plan: 'free' }),
  });
  await fillRegister(page);
  await expect.poll(async () => JSON.parse(await page.evaluate(() => localStorage.getItem('user')))?.id).toBe(10);
});

test('G4: chatbot thực thi xong thì trang tòa nhà tự tải lại', async ({ page }) => {
  await login(page, 'landlord');
  const calls = await mockApi(page, {
    'POST /chat': (r) => json(r, {
      reply: 'Tạo phòng 101?',
      pendingAction: { tool: 'create_room', params: { buildingId: 1, roomNumber: '101', price: 3500000, capacity: 2, area: 20 } },
    }),
    'POST /chat/execute': (r) => json(r, { message: 'Đã tạo phòng 101 thành công.' }),
  });
  await page.goto('/landlord/buildings');
  await page.getByTestId('chat-launcher').click();
  await page.getByTestId('chat-input').fill('tạo phòng 101');
  await page.getByTestId('chat-send').click();
  await expect(page.getByTestId('chat-action-card')).toBeVisible();
  const before = count(calls, 'GET /manage/buildings');
  await page.getByTestId('chat-action-confirm').click();
  await expect(page.getByTestId('chat-messages')).toContainText('Đã tạo phòng 101 thành công.');
  await expect.poll(() => count(calls, 'GET /manage/buildings')).toBeGreaterThan(before);
});

test('G4: chatbot thực thi xong thì trang sự cố của khách thuê tự tải lại', async ({ page }) => {
  await login(page, 'tenant');
  const calls = await mockApi(page, {
    'POST /chat': (r) => json(r, {
      reply: 'Gửi báo sự cố?',
      pendingAction: { tool: 'create_support_request', params: { title: 'Hỏng đèn', description: 'Đèn phòng tắm' } },
    }),
    'POST /chat/execute': (r) => json(r, { message: 'Đã gửi báo sự cố.' }),
  });
  await page.goto('/tenant/support');
  await page.getByTestId('chat-launcher').click();
  await page.getByTestId('chat-input').fill('báo hỏng đèn');
  await page.getByTestId('chat-send').click();
  await expect(page.getByTestId('chat-action-card')).toBeVisible();
  const before = count(calls, 'GET /tenant/support');
  await page.getByTestId('chat-action-confirm').click();
  await expect(page.getByTestId('chat-messages')).toContainText('Đã gửi báo sự cố.');
  await expect.poll(() => count(calls, 'GET /tenant/support')).toBeGreaterThan(before);
});

test('G5: dashboard admin ghi rõ doanh thu là ước tính', async ({ page }) => {
  await login(page, 'admin');
  await mockApi(page, {
    'GET /admin/stats': (r) => json(r, {
      stats: { totalRevenue: 500000, landlordCount: 3 }, packages: { total: 3, pro: 1, basic: 1, free: 1 }, recentActivity: [],
    }),
  });
  await page.goto('/admin/dashboard');
  await expect(page.getByText('Doanh thu ước tính (theo gói đang hoạt động)')).toBeVisible();
  await expect(page.getByText('Doanh thu gói cước / tháng')).toHaveCount(0);
});

test('G6: mở khóa khách thuê bị khóa', async ({ page }) => {
  await login(page, 'landlord');
  let status = 'locked';
  const calls = await mockApi(page, {
    'GET /manage/tenants': (r) => json(r, [
      { id: 7, name: 'Khách Khóa', phone: '0900000007', status, lockReason: 'Nợ', createdAt: '2026-01-01' },
      { id: 8, name: 'Khách Thường', phone: '0900000008', status: 'active', createdAt: '2026-01-01' },
    ]),
    'PUT /manage/tenants/7': (r) => { status = 'active'; return json(r, { message: 'Đã mở khóa tài khoản khách thuê' }); },
  });
  await page.goto('/landlord/tenants');
  await expect(page.getByRole('row', { name: /Khách Thường/ }).getByRole('button', { name: /Mở khóa/ })).toHaveCount(0);
  await page.getByRole('row', { name: /Khách Khóa/ }).getByRole('button', { name: /Mở khóa/ }).click();
  await expect(page.getByText('Đã mở khóa tài khoản khách thuê')).toBeVisible();
  expect(calls.find((c) => c.key === 'PUT /manage/tenants/7').body).toEqual({ status: 'active' });
  await expect(page.getByRole('row', { name: /Khách Khóa/ }).getByText('Đã khóa')).toHaveCount(0);
});
