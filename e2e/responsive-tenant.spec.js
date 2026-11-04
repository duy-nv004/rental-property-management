import { test, expect } from '@playwright/test';
import { fixtureFor, tenantSummary, contracts } from './fixtures/responsive-data.js';

/**
 * Responsive trang khách thuê ở phone (375x812): modal vừa màn hình,
 * input dùng được hết chiều ngang, nút chính đủ cao để chạm (>= 40px).
 */

const W = 375;

async function login(page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-init')) return;
    sessionStorage.setItem('e2e-init', '1');
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', 'tenant');
    localStorage.setItem('username', 'E2E tenant');
  });
}

async function mockApi(page, overrides = {}) {
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    const key = `${req.method()} ${path}`;
    const body = key in overrides ? overrides[key] : fixtureFor(req.method(), path);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

async function open(page, url, overrides) {
  await page.setViewportSize({ width: W, height: 812 });
  await login(page);
  await mockApi(page, overrides);
  await page.goto(url);
  await expect(page.locator('h1:visible, h2:visible').first()).toBeVisible();
}

// Chờ animation (vào trang / zoom modal) xong rồi mới đo, tránh đo khi đang scale
const box = (loc) => loc.evaluate(async (e) => {
  await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {})));
  const r = e.getBoundingClientRect();
  return { x: r.x, w: r.width, h: r.height };
});

async function expectDialogFits(page) {
  const dialog = page.locator('.ant-modal:visible').last();
  await expect(dialog).toBeVisible();
  const b = await box(dialog);
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.w).toBeLessThanOrEqual(W);
  return dialog;
}

async function expectTall(loc, min = 40) {
  const { h } = await box(loc);
  expect(h, `button height ${h}`).toBeGreaterThanOrEqual(min);
}

async function expectNoPageScroll(page) {
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw).toBeLessThanOrEqual(W + 1);
}

test('dashboard: nút hành động chạm được', async ({ page }) => {
  await open(page, '/tenant/dashboard');
  await expectTall(page.getByRole('button', { name: 'Kết nối ngay' }));
  await expectTall(page.getByRole('button', { name: /Thanh toán ngay/ }));
  await expectTall(page.getByRole('button', { name: 'Xem chi tiết hợp đồng' }));
  await expectNoPageScroll(page);
});

test('invoices: nút thẻ + modal chi tiết & QR vừa màn hình', async ({ page }) => {
  await open(page, '/tenant/invoices');
  const detail = page.getByRole('button', { name: 'Chi tiết' }).first();
  await expectTall(detail);
  await expectTall(page.getByRole('button', { name: 'Thanh toán', exact: true }).first());

  // Chọn hóa đơn chưa đóng để có nút "Thanh toán ngay" trong modal
  await page.getByRole('button', { name: 'Thanh toán', exact: true }).first().click();
  const qr = await expectDialogFits(page);
  const img = qr.locator('.qr-box img');
  const imgBox = await box(img);
  expect(imgBox.w).toBeLessThanOrEqual(W - 32);
  await expectTall(qr.getByRole('button', { name: /Mở ảnh QR mới/ }));
  await qr.getByRole('button', { name: 'Quay lại' }).click();

  await page.keyboard.press('Escape');
  await detail.click();
  const d = await expectDialogFits(page);
  await expect(d.getByText('Tiền phòng')).toBeVisible();
  await expectNoPageScroll(page);
});

test('contract: nút yêu cầu + modal báo trả phòng vừa màn hình, input full width', async ({ page }) => {
  await open(page, '/tenant/contract');
  const moveOut = page.getByRole('button', { name: 'Báo trả phòng' });
  await expectTall(moveOut);
  await expectTall(page.getByRole('button', { name: 'Đề nghị gia hạn' }));
  await moveOut.click();
  const dialog = await expectDialogFits(page);
  const body = await box(dialog.locator('.ant-modal-body'));
  const picker = await box(dialog.locator('.ant-picker'));
  expect(picker.w).toBeGreaterThanOrEqual(body.w - 60);
  await expectTall(dialog.getByRole('button', { name: 'Gửi yêu cầu' }));
  await expectNoPageScroll(page);
});

test('contract chờ ký: modal ký & từ chối vừa màn hình', async ({ page }) => {
  const pending = contracts[2];
  await open(page, '/tenant/contract', {
    'GET /tenant/summary': {
      ...tenantSummary,
      hasActiveContract: false, hasPendingContract: true, pendingContractIds: [pending.id],
      contract: pending, contracts: [pending],
    },
  });
  const sign = page.getByRole('button', { name: /Vẽ & Ký hợp đồng ngay/ });
  await expectTall(sign);
  await expectTall(page.getByRole('button', { name: 'Từ chối' }));
  await sign.click();
  const sigDialog = await expectDialogFits(page);
  const canvas = await box(sigDialog.locator('canvas'));
  expect(canvas.w).toBeLessThanOrEqual(W - 32);
  await page.keyboard.press('Escape');
  await expect(sigDialog).toBeHidden();

  await page.getByRole('button', { name: 'Từ chối' }).click();
  const rej = await expectDialogFits(page);
  await expectTall(rej.getByRole('button', { name: 'Xác nhận từ chối' }));
  await expectNoPageScroll(page);
});

test('support: form full width, nút gửi đủ cao', async ({ page }) => {
  await open(page, '/tenant/support');
  const card = await box(page.locator('form').first());
  for (const sel of ['textarea', '.ant-select']) {
    const b = await box(page.locator('form').first().locator(sel).first());
    expect(b.w).toBeGreaterThanOrEqual(card.w - 2);
  }
  await expectTall(page.getByRole('button', { name: 'Gửi yêu cầu hỗ trợ' }), 44);
  await expectNoPageScroll(page);
});

test('profile: đổi mật khẩu + modal người ở cùng vừa màn hình', async ({ page }) => {
  await open(page, '/tenant/profile');
  await expectTall(page.getByRole('button', { name: /Cập nhật mật khẩu/ }), 44);
  const add = page.getByRole('button', { name: 'Thêm người ở cùng' });
  await expectTall(add);
  await add.click();
  const dialog = await expectDialogFits(page);
  const body = await box(dialog.locator('.ant-modal-body'));
  const input = await box(dialog.locator('input').first());
  expect(input.w).toBeGreaterThanOrEqual(body.w - 60);
  await expectTall(dialog.getByRole('button', { name: 'Thêm' }));
  await expectNoPageScroll(page);
});
