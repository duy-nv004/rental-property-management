import { test, expect } from '@playwright/test';
import { fixtureFor } from './fixtures/responsive-data.js';

const W_PHONE = 375;
const H_PHONE = 812;
const W_DESKTOP = 1366;
const H_DESKTOP = 900;

async function setupPage(page, url, { width, height }) {
  await page.setViewportSize({ width, height });
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
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixtureFor(req.method(), path))
    });
  });
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

test.describe('Mobile Responsive & Compact UI (ui-ux-pro-max)', () => {
  test('SupportManager @phone — thanh lọc gọn với nút Bộ lọc & Bottom Sheet Drawer', async ({ page }) => {
    await setupPage(page, '/landlord/support', { width: W_PHONE, height: H_PHONE });

    // Trên điện thoại, nút mở bộ lọc nâng cao phải xuất hiện
    const filterBtn = page.locator('[data-testid="open-mobile-filter"]');
    await expect(filterBtn).toBeVisible();

    // Ô tìm kiếm phải vừa vặn, không làm tràn trang
    const searchInput = page.locator('[data-testid="support-search-input"], .mobile-filter-search');
    await expect(searchInput.first()).toBeVisible();

    // Bấm nút mở Drawer bộ lọc
    await filterBtn.click();
    const drawer = page.locator('[data-testid="mobile-filter-drawer"]');
    await expect(drawer).toBeVisible();

    // Chọn bộ lọc trạng thái "Chờ xử lý" trong drawer
    const drawerSelect = drawer.locator('.ant-select').first();
    await drawerSelect.click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option').first().click();

    // Áp dụng bộ lọc
    const applyBtn = drawer.locator('[data-testid="apply-mobile-filter"]');
    await applyBtn.click();

    // Drawer đóng lại và badge hiển thị số bộ lọc đang chọn
    await expect(drawer).not.toBeVisible();
    const badge = page.locator('.mobile-filter-bar .ant-badge-count');
    await expect(badge).toBeVisible();

    // Không bị cuộn ngang toàn trang
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(W_PHONE + 1);
  });

  test('SupportManager @desktop — giữ nguyên thanh lọc mở rộng nhiều dropdown', async ({ page }) => {
    await setupPage(page, '/landlord/support', { width: W_DESKTOP, height: H_DESKTOP });

    // Trên desktop, thanh lọc thông thường với nhiều select xuất hiện
    const desktopToolbar = page.locator('.desktop-filter-bar');
    await expect(desktopToolbar).toBeVisible();
    const selects = desktopToolbar.locator('.ant-select');
    expect(await selects.count()).toBeGreaterThanOrEqual(3);

    // Nút mở drawer trên mobile không hiển thị
    const filterBtn = page.locator('[data-testid="open-mobile-filter"]');
    await expect(filterBtn).not.toBeVisible();
  });

  test('Financials @phone — StatCards dạng Grid 2 cột (xs={12}) nhỏ gọn', async ({ page }) => {
    await setupPage(page, '/landlord/financials', { width: W_PHONE, height: H_PHONE });

    // Thẻ stat-card trên mobile không được chiếm trọn 100% màn hình (> 300px), mà phải là 2 cột (width < 190px)
    const cards = page.locator('.stat-card');
    await expect(cards.first()).toBeVisible();
    const firstCardBox = await cards.first().boundingBox();
    expect(firstCardBox.width).toBeLessThanOrEqual(W_PHONE * 0.55);

    // Không bị tràn cuộn ngang
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(W_PHONE + 1);
  });

  test('ContractManager @phone — thanh lọc gom vào nút Bộ lọc & Bottom Sheet Drawer', async ({ page }) => {
    await setupPage(page, '/landlord/contracts', { width: W_PHONE, height: H_PHONE });

    // Nút mở bộ lọc mobile xuất hiện
    const filterBtn = page.locator('[data-testid="open-mobile-filter"]');
    await expect(filterBtn).toBeVisible();

    // Bấm mở drawer bộ lọc
    await filterBtn.click();
    const drawer = page.locator('[data-testid="mobile-filter-drawer"]');
    await expect(drawer).toBeVisible();

    // Chứa select lọc tòa nhà và trạng thái
    await expect(drawer.locator('.ant-select').first()).toBeVisible();
    await page.locator('[data-testid="apply-mobile-filter"]').click();
    await expect(drawer).not.toBeVisible();
  });

  test('TenantManager @phone — thanh lọc gom vào nút Bộ lọc & Bottom Sheet Drawer', async ({ page }) => {
    await setupPage(page, '/landlord/tenants', { width: W_PHONE, height: H_PHONE });

    // Nút mở bộ lọc mobile xuất hiện
    const filterBtn = page.locator('[data-testid="open-mobile-filter"]');
    await expect(filterBtn).toBeVisible();

    // Bấm mở drawer bộ lọc
    await filterBtn.click();
    const drawer = page.locator('[data-testid="mobile-filter-drawer"]');
    await expect(drawer).toBeVisible();

    // Chứa select lọc phân loại
    await expect(drawer.locator('.ant-select').first()).toBeVisible();
    await page.locator('[data-testid="apply-mobile-filter"]').click();
    await expect(drawer).not.toBeVisible();
  });

  test('ResponsiveFilterBar @phone — icon tìm kiếm khớp kích thước chiều cao với ô input', async ({ page }) => {
    await setupPage(page, '/landlord/support', { width: W_PHONE, height: H_PHONE });

    const searchWrapper = page.locator('.mobile-filter-search');
    await expect(searchWrapper).toBeVisible();

    const box = await searchWrapper.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(38);

    // Icon tìm kiếm bên trong ô input phải hiển thị cân đối (>= 16px)
    const icon = searchWrapper.locator('svg').first();
    await expect(icon).toBeVisible();
    const iconBox = await icon.boundingBox();
    expect(iconBox.width).toBeGreaterThanOrEqual(15);
    expect(iconBox.height).toBeGreaterThanOrEqual(15);
  });
});

