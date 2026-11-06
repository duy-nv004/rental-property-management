import { test, expect } from '@playwright/test';

/**
 * E2E Test: Cơ chế Refresh Token & Quản lý Phiên Đơn Thiết Bị (Single-Device Session)
 * Sử dụng Page Object Model & Route Mocking theo chuẩn Playwright.
 */

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

test.describe('Refresh Token & Single-Device Authentication Flow', () => {

  test('Silent Refresh: Tự động cấp lại Access Token khi hết hạn mà không làm gián đoạn người dùng', async ({ page }) => {
    let buildingsCalled = 0;
    let refreshCalled = 0;

    await page.route('**/api/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^.*\/api/, '');
      const key = `${req.method()} ${path}`;

      if (key === 'GET /manage/buildings') {
        buildingsCalled++;
        if (buildingsCalled === 1) {
          // Lần 1: Giả lập Access Token cũ đã hết hạn (401)
          return json(route, { message: 'Token đã hết hạn', code: 'TOKEN_EXPIRED' }, 401);
        }
        // Lần 2 (Retry sau khi refresh thành công): Trả về danh sách tòa nhà
        return json(route, [{ id: 1, name: 'Tòa nhà Landmark', address: '123 Cầu Giấy', totalRooms: 5 }]);
      }

      if (key === 'GET /manage/rooms') {
        return json(route, []);
      }

      if (key === 'POST /auth/refresh-token') {
        refreshCalled++;
        return json(route, {
          accessToken: 'new_fresh_access_token_999',
          token: 'new_fresh_access_token_999'
        });
      }

      if (key === 'GET /notifications/unread') {
        return json(route, []);
      }

      return json(route, []);
    });

    // Khởi tạo phiên giả lập của chủ nhà với access token cũ
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'expired_old_token_111');
      localStorage.setItem('role', 'landlord');
      localStorage.setItem('username', 'Chủ Nhà Test');
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Chủ Nhà Test', role: 'landlord' }));
    });

    // Truy cập trang quản lý tòa nhà
    await page.goto('/landlord/buildings');

    // Chờ giao diện hiển thị tên tòa nhà sau khi retry thành công
    await expect(page.locator('text=Tòa nhà Landmark')).toBeVisible({ timeout: 10000 });

    // Kiểm tra: Endpoint refresh đã được gọi đúng 1 lần
    expect(refreshCalled).toBe(1);
    expect(buildingsCalled).toBeGreaterThanOrEqual(2);

    // Kiểm tra: Access Token mới đã được cập nhật vào localStorage
    const savedToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(savedToken).toBe('new_fresh_access_token_999');

    // Người dùng vẫn ở lại trang /landlord/buildings, KHÔNG bị đá về /login
    expect(page.url()).toContain('/landlord/buildings');
  });

  test('Single-Device Kickout: Bị đá về Login kèm thông báo khi tài khoản đăng nhập từ thiết bị khác', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^.*\/api/, '');
      const key = `${req.method()} ${path}`;

      if (key === 'GET /manage/buildings' || key === 'GET /manage/rooms') {
        // Access token hết hạn
        return json(route, { message: 'Token đã hết hạn' }, 401);
      }

      if (key === 'POST /auth/refresh-token') {
        // Backend từ chối do tài khoản đã đăng nhập từ thiết bị mới
        return json(route, {
          message: 'Tài khoản của bạn đã được đăng nhập từ một thiết bị khác. Vui lòng đăng nhập lại.'
        }, 401);
      }

      return json(route, []);
    });

    await page.addInitScript(() => {
      if (sessionStorage.getItem('e2e-kick-init')) return;
      sessionStorage.setItem('e2e-kick-init', '1');
      localStorage.setItem('accessToken', 'kicked_old_token');
      localStorage.setItem('role', 'landlord');
      localStorage.setItem('username', 'Chủ Nhà Bị Kicked');
    });

    await page.goto('/landlord/buildings');

    // Trình duyệt phải tự động chuyển hướng về trang /login
    await page.waitForURL('**/login', { timeout: 10000 });

    // Hiển thị thông báo cảnh báo rõ ràng cho người dùng
    await expect(page.locator('text=thiết bị khác')).toBeVisible({ timeout: 5000 });

    // LocalStorage đã được dọn sạch
    const tokenAfterKick = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(tokenAfterKick).toBeNull();
  });

  test('Logout: Thu hồi phiên và chuyển hướng về trang Login', async ({ page }) => {
    let logoutApiCalled = false;

    await page.route('**/api/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const path = url.pathname.replace(/^.*\/api/, '');
      const key = `${req.method()} ${path}`;

      if (key === 'POST /auth/logout') {
        logoutApiCalled = true;
        return json(route, { message: 'Đăng xuất thành công' });
      }

      return json(route, []);
    });

    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'active_token');
      localStorage.setItem('role', 'tenant');
      localStorage.setItem('username', 'Khách Thuê');
    });

    await page.goto('/tenant/dashboard');

    // Tìm và nhấn nút Đăng xuất trong menu footer của sidebar
    const logoutBtn = page.locator('.app-menu-footer').getByText('Đăng xuất');
    await expect(logoutBtn).toBeVisible({ timeout: 5000 });
    await logoutBtn.click();

    // Chờ điều hướng về /login
    await page.waitForURL('**/login', { timeout: 5000 });

    // Đã gọi API logout ở backend
    expect(logoutApiCalled).toBe(true);

    // Dọn sạch phiên trên máy
    const remainingToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(remainingToken).toBeNull();
  });

});
