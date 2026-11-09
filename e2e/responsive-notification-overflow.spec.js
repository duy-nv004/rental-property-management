import { test, expect } from '@playwright/test';
import { fixtureFor } from './fixtures/responsive-data.js';

const W_PHONE = 375;
const H_PHONE = 812;
const W_SMALL_PHONE = 360;

async function setupPage(page, url, { width = W_PHONE, height = H_PHONE, role = 'landlord' } = {}) {
  await page.setViewportSize({ width, height });
  await page.addInitScript(({ mockRole }) => {
    sessionStorage.setItem('e2e-init', '1');
    localStorage.setItem('accessToken', 'e2e-fake-token');
    localStorage.setItem('token', 'e2e-fake-token');
    localStorage.setItem('role', mockRole);
    localStorage.setItem('username', mockRole === 'landlord' ? 'Chủ nhà Test' : 'Khách thuê Test');
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      name: mockRole === 'landlord' ? 'Chủ nhà Test' : 'Khách thuê Test',
      role: mockRole,
      plan: 'basic'
    }));
  }, { mockRole: role });

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

test.describe('Responsive Notification & Layout Overflow Prevention (ui-ux-pro-max)', () => {
  test('Popup Antd Notification trên mobile không bị tràn màn hình và không bị lệch sang trái', async ({ page }) => {
    await setupPage(page, '/landlord/dashboard', { width: W_SMALL_PHONE, height: H_PHONE });

    // Kích hoạt notification của Antd trực tiếp trên trang
    await page.evaluate(() => {
      const { notification } = window.antd || {};
      if (notification) {
        notification.success({
          message: 'Thanh toán thành công 🎉',
          description: 'Hóa đơn #123456 (phòng 102 - Tòa Sunshine) đã được thanh toán qua VietQR SePay thành công.',
          placement: 'top',
          duration: 0
        });
      }
    });

    // Chờ thông báo xuất hiện
    const notice = page.locator('.ant-notification-notice');
    if (await notice.count() > 0) {
      await expect(notice.first()).toBeVisible();

      // Kiểm tra toạ độ bounding box của notice: phải nằm hoàn toàn trong màn hình 360px
      const box = await notice.first().boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(W_SMALL_PHONE);

      // Toàn trang không xuất hiện thanh cuộn ngang
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(W_SMALL_PHONE + 1);
    }
  });

  test('Banner Alert có nút bấm hành động (Plans.jsx) tự động xuống dòng và không tràn mép', async ({ page }) => {
    await setupPage(page, '/landlord/plans', { width: W_SMALL_PHONE, height: H_PHONE });

    // Kiểm tra trang tải không bị vỡ cuộn ngang
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(W_SMALL_PHONE + 1);

    // Mọi alert trên trang phải nằm trong chiều rộng màn hình
    const alerts = page.locator('.ant-alert');
    const alertCount = await alerts.count();
    for (let i = 0; i < alertCount; i++) {
      const alert = alerts.nth(i);
      if (await alert.isVisible()) {
        const box = await alert.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(W_SMALL_PHONE + 2);
      }
    }
  });

  test('Bảng kiểm kê đồ dùng trong ContractManager bọc trong scroll-x và không làm vỡ Modal', async ({ page }) => {
    await setupPage(page, '/landlord/contracts', { width: W_SMALL_PHONE, height: H_PHONE });

    // Mở Modal lập hợp đồng mới
    const createBtn = page.locator('button:has-text("Tạo hợp đồng mới")');
    if (await createBtn.isVisible()) {
      await createBtn.click();
      const modal = page.locator('.ant-modal:visible');
      await expect(modal).toBeVisible();

      // Modal không được vượt quá bề rộng màn hình
      const modalBox = await modal.boundingBox();
      expect(modalBox.x).toBeGreaterThanOrEqual(0);
      expect(modalBox.width).toBeLessThanOrEqual(W_SMALL_PHONE + 2);

      // Bảng inv-table phải nằm trong container cuộn ngang (.scroll-x)
      const invTable = modal.locator('.inv-table');
      if (await invTable.count() > 0) {
        const parentScroll = invTable.first().locator('xpath=ancestor::div[contains(@class, "scroll-x")]');
        expect(await parentScroll.count()).toBeGreaterThan(0);
      }
    }
  });

  test('Banner cài đặt PWA và Chat Widget không chồng đè lên nhau trên mobile', async ({ page }) => {
    await setupPage(page, '/landlord/dashboard', { width: W_PHONE, height: H_PHONE });

    const pwaBanner = page.locator('.pwa-install-mobile-banner');
    const chatBtn = page.locator('.chat-launcher');

    if (await pwaBanner.isVisible() && await chatBtn.isVisible()) {
      const pwaBox = await pwaBanner.boundingBox();
      const chatBox = await chatBtn.boundingBox();

      // Kiểm tra 2 bounding box không giao nhau (không đè lên nhau)
      const isOverlapping = !(
        pwaBox.x + pwaBox.width <= chatBox.x ||
        chatBox.x + chatBox.width <= pwaBox.x ||
        pwaBox.y + pwaBox.height <= chatBox.y ||
        chatBox.y + chatBox.height <= pwaBox.y
      );

      expect(isOverlapping).toBe(false);
    }
  });

  test('Drawer chuông thông báo trên mobile không bị chèn ép nút đóng [X]', async ({ page }) => {
    await setupPage(page, '/landlord/dashboard', { width: W_SMALL_PHONE, height: H_PHONE });

    // Mở drawer thông báo từ chuông trên header
    const bellBtn = page.locator('button[aria-label^="Thông báo"]').first();
    if (await bellBtn.isVisible()) {
      await bellBtn.click();
      const drawer = page.locator('.ant-drawer:visible');
      await expect(drawer).toBeVisible();

      // Nút đóng của drawer không bị che
      const closeBtn = drawer.locator('.ant-drawer-close');
      if (await closeBtn.isVisible()) {
        const closeBox = await closeBtn.boundingBox();
        expect(closeBox.width).toBeGreaterThanOrEqual(20);
      }
    }
  });
});

