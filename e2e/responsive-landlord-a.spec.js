import { test, expect } from '@playwright/test';
import { fixtureFor } from './fixtures/responsive-data.js';

// Nhóm landlord-a ở phone 375x812: modal/drawer vừa màn hình, input dùng được,
// bảng cuộn trong khung, nút chính >= 40px, grid 1 cột.
const W = 375;

async function setup(page, url) {
  await page.setViewportSize({ width: W, height: 812 });
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e-init')) return;
    sessionStorage.setItem('e2e-init', '1');
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('role', 'landlord');
    localStorage.setItem('username', 'E2E landlord');
  });
  await page.route('**/api/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^.*\/api/, '');
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixtureFor(req.method(), path)) });
  });
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

async function expectDialogFits(page) {
  const dialog = page.locator('.ant-modal:visible, .ant-drawer-content-wrapper:visible').last();
  await expect(dialog).toBeVisible();
  // chờ hết animation zoom/slide của antd, nếu không boundingBox đo lúc đang scale
  await page.waitForFunction(() => document.getAnimations().length === 0);
  const box = await dialog.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.width).toBeLessThanOrEqual(W);
  // input trong dialog không tràn và đủ rộng để gõ
  for (const b of await dialog.locator('.ant-form-item .ant-input:visible, .ant-form-item .ant-input-number:visible, .ant-form-item .ant-select:visible, .ant-form-item .ant-picker:visible').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))) {
    expect(b.right).toBeLessThanOrEqual(W);
    expect(b.width).toBeGreaterThanOrEqual(W * 0.6); // input gần full width
  }
  for (const h of await dialog.locator('.ant-modal-footer .ant-btn-primary:visible').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
    expect(h).toBeGreaterThanOrEqual(40);
  }
  return dialog;
}

async function expectNoPageScroll(page) {
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(sw).toBeLessThanOrEqual(W + 1);
}

async function expectTableScrollsInside(page) {
  const t = page.locator('.ant-table-wrapper').first();
  await expect(t).toBeVisible();
  const box = await t.boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(W + 1);
  await expectNoPageScroll(page);
}

async function expectPrimaryTall(page) {
  for (const h of await page.locator('.page-header-actions .ant-btn-primary:visible').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
    expect(h).toBeGreaterThanOrEqual(40);
  }
}

test('dashboard @phone — stat card 1 cột, bảng cuộn trong khung', async ({ page }) => {
  await setup(page, '/landlord/dashboard');
  const widths = await page.locator('.stat-card').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
  expect(widths.length).toBeGreaterThan(0);
  for (const w of widths) expect(w).toBeGreaterThan(W * 0.7);
  await expectTableScrollsInside(page);
  await expectPrimaryTall(page);
});

test('financials @phone — không cuộn ngang, biểu đồ có chiều cao', async ({ page }) => {
  await setup(page, '/landlord/financials');
  await expectNoPageScroll(page);
  const h = await page.locator('.recharts-responsive-container').first().evaluate((e) => e.getBoundingClientRect().height);
  expect(h).toBeGreaterThanOrEqual(200);
});

test('buildings @phone — modal thêm tòa nhà + dịch vụ vừa màn hình', async ({ page }) => {
  await setup(page, '/landlord/buildings');
  await expectPrimaryTall(page);
  await page.getByRole('button', { name: /Thêm tòa nhà mới/ }).click();
  await expectDialogFits(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Đơn giá|dịch vụ/i }).first().click();
  await expectDialogFits(page);
});

test('buildings @phone — modal thêm phòng: form 1 cột', async ({ page }) => {
  await setup(page, '/landlord/buildings');
  await page.getByRole('button', { name: /Xem sơ đồ phòng/ }).first().click();
  await expectNoPageScroll(page);
  await page.getByRole('button', { name: /Thêm phòng mới/ }).click();
  const dialog = await expectDialogFits(page);
  // Sức chứa và Diện tích xếp dọc trên phone
  const cap = await dialog.getByLabel(/Sức chứa/).boundingBox();
  const area = await dialog.getByLabel(/Diện tích/).boundingBox();
  expect(area.y).toBeGreaterThan(cap.y + cap.height - 1);
});

test('tenants @phone — bảng cuộn trong khung, modal tạo tài khoản vừa màn hình', async ({ page }) => {
  await setup(page, '/landlord/tenants');
  await expectTableScrollsInside(page);
  await expectPrimaryTall(page);
  await page.getByRole('button', { name: /Tạo tài khoản/ }).first().click();
  await expectDialogFits(page);
});

test('utilities @phone — bảng cuộn trong khung, bộ lọc full width', async ({ page }) => {
  await setup(page, '/landlord/utilities');
  await expectTableScrollsInside(page);
  await expectPrimaryTall(page);
  const sel = await page.getByLabel('Chọn tòa nhà').locator('xpath=ancestor::div[contains(@class,"ant-select")][1]').boundingBox();
  expect(sel.width).toBeGreaterThan(W * 0.7);
});

test('invoices @phone — bảng cuộn trong khung, modal thu tiền + drawer chi tiết vừa màn hình', async ({ page }) => {
  await setup(page, '/landlord/invoices');
  await expectTableScrollsInside(page);
  await page.getByRole('button', { name: 'Xác nhận đã thu' }).first().click();
  await expectDialogFits(page);
  await page.locator('.ant-modal-footer').getByRole('button', { name: 'Hủy', exact: true }).click();
  await page.getByRole('button', { name: 'Xem', exact: true }).first().click();
  await expectDialogFits(page);
});
