import { test, expect } from '@playwright/test';

/**
 * E2E Phase 7: S1 (báo sự cố kèm ảnh, loại sự cố, phản hồi + chi phí của chủ nhà).
 * Mock toàn bộ API, không cần backend thật.
 */

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function login(page, role) {
  await page.addInitScript(([r]) => {
    if (sessionStorage.getItem('e2e-init')) return;
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
    const url = new URL(req.url());
    const path = url.pathname.replace(/^.*\/api/, '');
    const key = `${req.method()} ${path}`;
    const raw = req.method() !== 'GET' ? req.postData() : null;
    let body = raw;
    try { body = raw ? JSON.parse(raw) : null; } catch { /* multipart giữ nguyên chuỗi */ }
    calls.push({ key, body, contentType: req.headers()['content-type'] || '' });
    const handler = handlers[key];
    if (handler) return handler(route, req);
    return json(route, []);
  });
  return calls;
}

// Ảnh PNG 1x1
const PNG = globalThis.Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

const REQUESTS = [
  {
    id: 9, description: 'Vòi nước rò', severity: 'medium', status: 'resolved', category: 'water',
    images: ['uploads/support/a.png'], landlordNote: 'Đã thay vòi mới', repairCost: '150000',
    createdAt: '2026-10-01T08:00:00Z',
  },
];

test('S1: khách gửi sự cố dạng multipart kèm loại và ảnh, thấy phản hồi của chủ nhà', async ({ page }) => {
  await login(page, 'tenant');
  // R4: ảnh sự cố phải tải qua axios kèm Bearer token, không còn URL public
  let imageAuth = null;
  const calls = await mockApi(page, {
    'GET /tenant/support': (r) => json(r, REQUESTS),
    'POST /tenant/support': (r) => json(r, { message: 'Tạo yêu cầu hỗ trợ thành công' }, 201),
    'GET /support/9/images/a.png': (r, req) => {
      imageAuth = req.headers()['authorization'];
      return r.fulfill({ status: 200, contentType: 'image/png', body: PNG });
    },
  });
  await page.goto('/tenant/support');

  // Lịch sử: Tag loại, ảnh, ghi chú và chi phí
  const item = page.locator('.support-item', { hasText: 'Vòi nước rò' });
  await expect(item.getByText('Nước', { exact: true })).toBeVisible();
  await expect(item.locator('img')).toHaveAttribute('src', /^blob:/);
  expect(imageAuth).toBe('Bearer e2e-fake-token');
  await expect(item.getByText(/Đã thay vòi mới/)).toBeVisible();
  await expect(item.getByText(/150\.000 đ/)).toBeVisible();

  await page.getByLabel('Mô tả sự cố').fill('Ổ điện cháy');
  await page.getByLabel('Loại sự cố').click();
  await page.locator('.ant-select-item-option', { hasText: 'Điện' }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'o-dien.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('button', { name: 'Gửi yêu cầu hỗ trợ' }).click();

  await expect.poll(() => calls.find(c => c.key === 'POST /tenant/support')?.contentType).toMatch(/^multipart\/form-data; boundary=/);
  const body = calls.find(c => c.key === 'POST /tenant/support').body;
  expect(body).toContain('name="category"');
  expect(body).toContain('electric');
  expect(body).toContain('filename="o-dien.png"');
  expect(body).toContain('Ổ điện cháy');
});

test('S1: chủ nhà thấy loại + ảnh, bấm Hoàn thành nhập ghi chú và chi phí', async ({ page }) => {
  await login(page, 'landlord');
  let imageAuth = null;
  const calls = await mockApi(page, {
    'GET /support/5/images/b.png': (r, req) => {
      imageAuth = req.headers()['authorization'];
      return r.fulfill({ status: 200, contentType: 'image/png', body: PNG });
    },
    'GET /manage/support-requests': (r) => json(r, [{
      id: 5, description: 'Mất mạng', severity: 'high', status: 'in_progress', category: 'internet',
      images: ['uploads/support/b.png'], room: { roomNumber: '101', building: { name: 'Sunshine' } },
      createdAt: '2026-10-01T08:00:00Z',
    }]),
    'PUT /manage/support-requests/5': (r) => json(r, { message: 'ok' }),
  });
  await page.goto('/landlord/support');

  const row = page.locator('tr', { hasText: 'Mất mạng' });
  await expect(row.getByText('Internet', { exact: true })).toBeVisible();
  await expect(row.locator('img')).toHaveAttribute('src', /^blob:/);
  expect(imageAuth).toBe('Bearer e2e-fake-token');

  await row.getByRole('button', { name: 'Hoàn thành' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Ghi chú xử lý').fill('Đã reset modem');
  await dialog.getByLabel('Chi phí sửa (VND)').fill('200000');
  await dialog.getByRole('button', { name: 'Xác nhận' }).click();
  await expect.poll(() => calls.find(c => c.key === 'PUT /manage/support-requests/5')?.body)
    .toEqual({ status: 'resolved', landlordNote: 'Đã reset modem', repairCost: 200000 });
});
