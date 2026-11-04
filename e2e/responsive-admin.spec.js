import { test, expect } from '@playwright/test';
import { fixtureFor } from './fixtures/responsive-data.js';

/**
 * Responsive admin @phone (375x812): modal/popconfirm vừa màn hình, input dùng được
 * full width, bảng cuộn trong khung (không cuộn trang), nút chính >= 40px.
 */

const W = 375;

async function setup(page, path) {
  await page.setViewportSize({ width: W, height: 812 });
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-init')) return;
    sessionStorage.setItem('e2e-init', '1');
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', 'admin');
    localStorage.setItem('username', 'E2E admin');
  });
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixtureFor(req.method(), p)) });
  });
  await page.goto(`/admin/${path}`);
  await expect(page.locator('h1:visible').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
}

const width = (loc) => loc.evaluate((e) => e.getBoundingClientRect().width);
const height = (loc) => loc.evaluate((e) => e.getBoundingClientRect().height);

async function expectNoPageScroll(page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw).toBeLessThanOrEqual(iw + 1);
}

async function expectTableScrollsInside(page) {
  const box = page.locator('.ant-table-content, .ant-table-body').first();
  const { sw, cw } = await box.evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth }));
  expect(sw).toBeGreaterThan(cw); // bảng rộng hơn khung -> cuộn trong khung
  await expectNoPageScroll(page);
}

test('admin landlords @phone — bảng cuộn trong khung, modal khóa vừa màn hình', async ({ page }) => {
  await setup(page, 'landlords');
  await expectTableScrollsInside(page);

  const lockBtn = page.getByRole('button', { name: /^Khóa$/ }).first();
  expect(await height(lockBtn)).toBeGreaterThanOrEqual(40);
  await lockBtn.click();

  const dialog = page.getByRole('dialog').last();
  await expect(dialog).toBeVisible();
  const textarea = dialog.locator('textarea');
  // chờ animation zoom của modal kết thúc rồi mới đo
  await expect.poll(() => width(textarea)).toBeGreaterThan(250);
  expect(await width(dialog)).toBeLessThanOrEqual(W);
  expect(await height(dialog.getByRole('button', { name: 'Xác nhận' }))).toBeGreaterThanOrEqual(40);
});

test('admin logs @phone — bộ lọc full width, bảng cuộn trong khung', async ({ page }) => {
  await setup(page, 'logs');
  await expectTableScrollsInside(page);
  const content = await width(page.locator('.page-header').first());
  for (const sel of ['.ant-select', '.ant-picker-range', '.ant-input-search']) {
    expect(await width(page.locator(sel).first()), sel).toBeGreaterThanOrEqual(content - 2);
  }
});

test('admin tickets @phone — thẻ thống kê 1 cột, nút duyệt >= 40px, popconfirm vừa màn hình', async ({ page }) => {
  await setup(page, 'tickets');
  await expectTableScrollsInside(page);
  const content = await width(page.locator('.page-header').first());
  expect(await width(page.locator('.stat-card').first())).toBeGreaterThanOrEqual(content - 2);

  const approve = page.getByRole('button', { name: /Duyệt/ }).first();
  expect(await height(approve)).toBeGreaterThanOrEqual(40);
  await approve.click();
  const pop = page.locator('.ant-popover:visible').last();
  await expect(pop).toBeVisible();
  const b = await pop.boundingBox();
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(W + 1);
});

test('admin packages @phone — form gói 1 cột, nút lưu >= 40px', async ({ page }) => {
  await setup(page, 'packages');
  await expectNoPageScroll(page);
  const card = page.locator('form').first();
  const formW = await width(card);
  const inputs = card.locator('.ant-input-number');
  for (let i = 0; i < 4; i++) expect(await width(inputs.nth(i))).toBeGreaterThanOrEqual(formW - 2);
  expect(await height(card.getByRole('button', { name: /Lưu thay đổi/ }))).toBeGreaterThanOrEqual(40);
});

test('admin profile @phone — input full width, nút đổi mật khẩu >= 40px', async ({ page }) => {
  await setup(page, 'profile');
  await expectNoPageScroll(page);
  const form = page.locator('form').first();
  const formW = await width(form);
  expect(await width(form.locator('.ant-input-password').first())).toBeGreaterThanOrEqual(formW - 2);
  expect(await height(form.getByRole('button', { name: /Đổi mật khẩu/ }))).toBeGreaterThanOrEqual(40);
});
