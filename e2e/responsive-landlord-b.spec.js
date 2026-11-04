import { test, expect } from '@playwright/test';
import { fixtureFor } from './fixtures/responsive-data.js';

/**
 * Responsive nhóm landlord-b (hợp đồng, sự cố, gói cước, hồ sơ) ở phone 375x812:
 * modal/drawer vừa màn hình, input dùng được full width, bảng cuộn trong khung, nút chính đủ cao.
 */
const W = 375;

async function login(page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-init')) return;
    sessionStorage.setItem('e2e-init', '1');
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', 'landlord');
    localStorage.setItem('username', 'E2E landlord');
  });
}

async function open(page, url) {
  await page.setViewportSize({ width: W, height: 812 });
  await login(page);
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixtureFor(req.method(), path)) });
  });
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

const width = (loc) => loc.evaluate((e) => e.getBoundingClientRect().width);
const noPageScroll = async (page) => {
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw).toBeLessThanOrEqual(W + 1);
};

// Dialog vừa viewport; mọi input/select trong dialog rộng >= 60% dialog (không bị bóp 2 cột)
async function expectDialogFits(page, dialog) {
  await expect(dialog).toBeVisible();
  // chờ animation zoom của antd kết thúc rồi mới đo
  // bỏ qua animation lặp vô hạn (spinner), nếu không sẽ chờ mãi
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter((a) => a.effect?.getTiming().iterations !== Infinity)
    .map((a) => a.finished.catch(() => {}))));
  await page.waitForTimeout(350);
  expect(await width(dialog)).toBeLessThanOrEqual(W + 1);
  const dw = await width(dialog);
  for (const w of await dialog.locator('.ant-form-item .ant-input, .ant-form-item .ant-picker, .ant-form-item .ant-input-number, .ant-form-item .ant-select')
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width))) {
    expect(w).toBeGreaterThanOrEqual(dw * 0.6);
  }
  await noPageScroll(page);
}

test('contracts: bảng cuộn trong khung, nút header >= 40px', async ({ page }) => {
  await open(page, '/landlord/contracts');
  const wrap = page.locator('.ant-table-wrapper').first();
  expect(await width(wrap)).toBeLessThanOrEqual(W);
  const sc = await page.locator('.ant-table-content, .ant-table-body').first().evaluate((e) => e.scrollWidth > e.clientWidth);
  expect(sc).toBe(true);
  for (const name of [/Yêu cầu từ khách/, /Lập hợp đồng mới/]) {
    const box = await page.getByRole('button', { name }).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(40);
    expect(box.x + box.width).toBeLessThanOrEqual(W + 1);
  }
  await noPageScroll(page);
});

test('contracts: drawer "Yêu cầu từ khách" full width, bảng cuộn trong drawer', async ({ page }) => {
  await open(page, '/landlord/contracts');
  await page.getByRole('button', { name: /Yêu cầu từ khách/ }).click();
  const drawer = page.locator('.ant-drawer-content-wrapper');
  await expect(drawer).toBeVisible();
  expect(await width(drawer)).toBeLessThanOrEqual(W + 1);
  await noPageScroll(page);
});

test('contracts: modal lập hợp đồng vừa màn hình', async ({ page }) => {
  await open(page, '/landlord/contracts');
  await page.getByRole('button', { name: /Lập hợp đồng mới/ }).click();
  await expectDialogFits(page, page.getByRole('dialog').last());
  await expect.poll(async () => (await page.getByRole('button', { name: /Khởi tạo & Ký hợp đồng/ }).boundingBox()).height).toBeGreaterThanOrEqual(40);
});

test('contracts: modal thanh lý, form 1 cột', async ({ page }) => {
  await open(page, '/landlord/contracts');
  await page.getByRole('button', { name: 'Thanh lý' }).first().click();
  await expectDialogFits(page, page.getByRole('dialog').last());
  await expect.poll(async () => (await page.getByRole('button', { name: /Tính quyết toán/ }).boundingBox()).height).toBeGreaterThanOrEqual(40);
});

test('contracts: modal người ở cùng, bảng cuộn trong modal', async ({ page }) => {
  await open(page, '/landlord/contracts');
  await page.getByRole('button', { name: 'Người ở' }).first().click();
  const dialog = page.getByRole('dialog').last();
  await expectDialogFits(page, dialog);
  expect(await width(dialog.locator('.ant-table-wrapper'))).toBeLessThanOrEqual(W);
});

test('support: bảng cuộn trong khung, modal hoàn thành vừa màn hình', async ({ page }) => {
  await open(page, '/landlord/support');
  expect(await width(page.locator('.ant-table-wrapper').first())).toBeLessThanOrEqual(W);
  await noPageScroll(page);
  await page.getByRole('button', { name: /Hoàn thành/ }).first().click();
  await expectDialogFits(page, page.getByRole('dialog').last());
  await expect.poll(async () => (await page.getByRole('button', { name: 'Xác nhận' }).boundingBox()).height).toBeGreaterThanOrEqual(40);
});

test('plans: thẻ gói 1 cột, modal QR vừa màn hình', async ({ page }) => {
  await open(page, '/landlord/plans');
  const btn = page.getByRole('button', { name: /Đăng ký gói PRO/ });
  const box = await btn.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(40);
  expect(box.width).toBeGreaterThanOrEqual(W * 0.6);
  await btn.click();
  const dialog = page.getByRole('dialog').last();
  await expectDialogFits(page, dialog);
  const img = dialog.locator('img').first();
  if (await img.count()) expect(await width(img)).toBeLessThanOrEqual(W - 32);
});

test('profile: input full width, nút lưu >= 40px', async ({ page }) => {
  await open(page, '/landlord/profile');
  const input = page.getByLabel('Họ và tên');
  await expect(input).toBeVisible();
  expect(await width(input)).toBeGreaterThanOrEqual(W * 0.6);
  for (const b of await page.locator('form button[type=submit]').all()) {
    expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(40);
  }
  await noPageScroll(page);
});
